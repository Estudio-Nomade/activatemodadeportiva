import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { confirmPayment } from "@/server/domain/orders/transitions";
import type { EmailPort } from "@/server/email/port";
import { paywayAmountToCents } from "@/server/payments/payway/amount";
import { parsePaywayNotification } from "@/server/payments/payway/parse-notification";
import type { PaywayPort } from "@/server/payments/payway/port";
import type { PushPort } from "@/server/push/port";

const APPROVED = new Set(["approved", "accredited"]);

export type HandlePaywayNotificationDeps = {
  db: ServiceClient;
  email: EmailPort;
  payway: PaywayPort;
  push: PushPort;
};

export async function handlePaywayNotification(
  body: unknown,
  deps: HandlePaywayNotificationDeps,
): Promise<{ ok: true }> {
  const { data: eventRow } = await deps.db
    .from("payway_webhook_events")
    .insert({ payload: body as never })
    .select("id")
    .single();

  const eventId = eventRow?.id as string | undefined;
  const mark = async (patch: { order_id?: string; processed_at?: string; error?: string }) => {
    if (!eventId) return;
    await deps.db.from("payway_webhook_events").update(patch).eq("id", eventId);
  };

  try {
    const parsed = parsePaywayNotification(body);
    if (!parsed.siteTransactionId) {
      throw new DomainError("PAYWAY_NOTIFICATION_INVALID", "Missing site_transaction_id");
    }

    const { data: order, error } = await deps.db
      .from("orders")
      .select("id, status, total_cents, payway_site_transaction_id")
      .or(
        `id.eq.${parsed.siteTransactionId},payway_site_transaction_id.eq.${parsed.siteTransactionId}`,
      )
      .maybeSingle();

    if (error || !order) {
      throw new DomainError("PAYWAY_NOTIFICATION_INVALID", "Order not found for notification");
    }

    await mark({ order_id: order.id });

    if (order.status !== "pendiente_pago") {
      await mark({ processed_at: new Date().toISOString() });
      return { ok: true };
    }

    const paymentId = parsed.paywayPaymentId;
    if (!paymentId) {
      throw new DomainError("PAYWAY_NOTIFICATION_INVALID", "Missing payment id");
    }

    const payment = await deps.payway.getPayment(paymentId);

    if (!APPROVED.has(payment.status.toLowerCase())) {
      await mark({ processed_at: new Date().toISOString() });
      return { ok: true };
    }

    if (payment.siteTransactionId !== (order.payway_site_transaction_id ?? order.id)) {
      if (payment.siteTransactionId !== order.id && payment.siteTransactionId !== parsed.siteTransactionId) {
        throw new DomainError("PAYWAY_NOTIFICATION_INVALID", "site_transaction_id mismatch");
      }
    }

    if (payment.amountCents !== order.total_cents) {
      // Also accept raw amount from notification if getPayment unit differs after sandbox
      if (
        parsed.amountRaw != null &&
        paywayAmountToCents(parsed.amountRaw) === order.total_cents
      ) {
        // ok via notification amount
      } else {
        throw new DomainError("PAYWAY_NOTIFICATION_INVALID", "Amount mismatch");
      }
    }

    await deps.db
      .from("orders")
      .update({
        payway_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    await confirmPayment(order.id, {
      db: deps.db,
      email: deps.email,
      push: deps.push,
    });
    await mark({ processed_at: new Date().toISOString() });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    await mark({ error: message });
    throw e;
  }
}

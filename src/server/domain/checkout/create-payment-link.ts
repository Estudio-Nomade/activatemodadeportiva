import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { selectOrderForPaywayLink } from "@/server/domain/orders/order-select";
import type { PaywayPort } from "@/server/payments/payway/port";

export type CreatePaymentLinkDeps = {
  db: ServiceClient;
  payway: PaywayPort;
  appBaseUrl: string;
  now?: Date;
};

function baseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function createPaymentLink(
  input: { token: string },
  deps: CreatePaymentLinkDeps,
): Promise<{ payment_link: string }> {
  const { data: orderRaw, error } = await selectOrderForPaywayLink(deps.db, input.token);

  if (error || !orderRaw) {
    throw new DomainError("ORDER_NOT_FOUND", "Order not found");
  }

  const order = orderRaw as {
    id: string;
    code: string;
    email: string;
    status: string;
    payment_method: string;
    total_cents: number;
    access_token: string;
    reservation_expires_at: string | null;
    payway_site_transaction_id?: string | null;
    payway_link_attempt?: number;
    installments?: number;
  };

  if (order.status !== "pendiente_pago") {
    throw new DomainError("ORDER_NOT_PENDING", "Order is not pending payment");
  }

  if (order.payment_method !== "payway") {
    throw new DomainError("VALIDATION_ERROR", "Order is not a Payway payment");
  }

  const now = deps.now ?? new Date();
  if (
    order.reservation_expires_at &&
    new Date(order.reservation_expires_at).getTime() < now.getTime()
  ) {
    throw new DomainError("RESERVATION_EXPIRED", "Reservation window expired");
  }

  const siteTransactionId = order.payway_site_transaction_id ?? order.id;
  const attempt = (order.payway_link_attempt ?? 0) + 1;
  const app = baseUrl(deps.appBaseUrl);
  // Payway checkout rejects success/cancel URLs longer than 100 chars (misleading cancel_url error).
  const returnUrl = `${app}/pedido?code=${encodeURIComponent(order.code)}`;

  const { data: items } = await deps.db
    .from("order_items")
    .select("variant_id, product_name, color, size, unit_price_cents, qty")
    .eq("order_id", order.id);

  let link;
  try {
    link = await deps.payway.createCheckoutLink({
      siteTransactionId,
      amountCents: order.total_cents,
      currency: "ARS",
      installments: order.installments ?? 1,
      description: `Pedido ${order.code}`,
      customerEmail: order.email,
      successUrl: returnUrl,
      cancelUrl: returnUrl,
      notificationsUrl: `${app}/api/payway/notifications`,
      products: (items ?? []).map((l) => ({
        id: l.variant_id ?? "item",
        quantity: l.qty,
        valueCents: l.unit_price_cents * l.qty,
        description: `${l.product_name} ${l.color} ${l.size}`.trim(),
      })),
    });
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw new DomainError("PAYWAY_LINK_FAILED", "Could not create Payway payment link");
  }

  await deps.db
    .from("orders")
    .update({
      payway_site_transaction_id: siteTransactionId,
      payway_link_attempt: attempt,
      payway_payment_id: link.paywayPaymentId ?? undefined,
      updated_at: now.toISOString(),
    })
    .eq("id", order.id);

  return { payment_link: link.paymentLink };
}

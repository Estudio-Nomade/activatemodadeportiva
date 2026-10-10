import type { Json } from "@/server/db/types";
import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { crossedLowStockThreshold } from "@/server/domain/push/low-stock";
import {
  orderCreatedPayload,
  stockLowPayload,
} from "@/server/domain/push/payloads";
import { sendAdminPushBestEffort } from "@/server/domain/push/send-best-effort";
import type { PaymentMethod, ShippingMethod } from "@/server/domain/pricing/calculate-totals";
import type { EmailPort } from "@/server/email/port";
import type { PaywayPort } from "@/server/payments/payway/port";
import type { PushPort } from "@/server/push/port";
import { assertShippingAddress } from "./address";
import { generateAccessToken, generateOrderCode } from "./code";
import {
  assertInstallmentsAllowed,
  parseInstallmentsAllowList,
} from "./installments";
import { mergeLinesByVariant } from "./merge-lines";
import { quote, type QuoteLineInput, type QuoteLineResult } from "./quote";

export type PlaceOrderInput = {
  customerName: string;
  phone: string;
  email: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  shippingAddress: Record<string, unknown> | null;
  lines: QuoteLineInput[];
  installments?: number;
};

export type PlaceOrderResult = {
  id: string;
  code: string;
  access_token: string;
  status: string;
  customer_name: string;
  phone: string;
  email: string;
  shipping_method: string;
  payment_method: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address: Json | null;
  reservation_expires_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  installments?: number;
  payment_link: string | null;
  link_error: "PAYWAY_LINK_FAILED" | "PAYWAY_CONFIG_MISSING" | null;
};

export type PlaceOrderDeps = {
  db: ServiceClient;
  email: EmailPort;
  payway: PaywayPort;
  push: PushPort;
  appBaseUrl: string;
  now?: Date;
};

function mapRpcError(error: { message: string; code?: string; details?: string }): never {
  const blob = `${error.message} ${error.details ?? ""} ${error.code ?? ""}`;
  if (blob.includes("STOCK_INSUFFICIENT")) {
    throw new DomainError("STOCK_INSUFFICIENT", "Insufficient stock");
  }
  if (blob.includes("INVALID_TRANSITION")) {
    throw new DomainError("INVALID_TRANSITION", "Invalid order transition");
  }
  if (blob.includes("ORDER_NOT_FOUND")) {
    throw new DomainError("ORDER_NOT_FOUND", "Order not found");
  }
  throw new DomainError("VALIDATION_ERROR", error.message);
}

function baseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function placeOrder(
  input: PlaceOrderInput,
  deps: PlaceOrderDeps,
): Promise<PlaceOrderResult> {
  if (!input.customerName?.trim() || !input.phone?.trim() || !input.email?.trim()) {
    throw new DomainError("VALIDATION_ERROR", "Customer contact fields are required");
  }

  assertShippingAddress(input.shippingMethod, input.shippingAddress);
  const lines = mergeLinesByVariant(input.lines);

  const settingsSelect = async (columns: string) =>
    deps.db.from("store_settings").select(columns).eq("id", 1).single();

  let { data: settings, error: settingsError } = await settingsSelect(
    "payway_installments, transfer_cbu_alias_text",
  );

  // Cloud may lag payway migration — still allow transfer/cash checkout.
  if (
    settingsError &&
    (settingsError.message ?? "").toLowerCase().includes("payway_installments")
  ) {
    ({ data: settings, error: settingsError } = await settingsSelect("transfer_cbu_alias_text"));
  }

  if (settingsError || !settings) {
    throw new DomainError("VALIDATION_ERROR", "Store settings not found");
  }

  // Cash is always single-shot (pay at pickup). Installment allow-list is Payway-only.
  const installments =
    input.paymentMethod === "payway" ? (input.installments ?? 1) : 1;
  if (input.paymentMethod === "payway") {
    const allowList = parseInstallmentsAllowList(
      (settings as { payway_installments?: number[] | null }).payway_installments,
    );
    assertInstallmentsAllowed(installments, allowList);
  }

  const priced = await quote(
    {
      lines,
      paymentMethod: input.paymentMethod,
      shippingMethod: input.shippingMethod,
      shippingAddress: input.shippingAddress,
    },
    { db: deps.db },
  );

  const now = deps.now ?? new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const payload = {
    code: generateOrderCode(),
    access_token: generateAccessToken(),
    customer_name: input.customerName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    shipping_method: input.shippingMethod,
    payment_method: input.paymentMethod,
    shipping_address: input.shippingAddress,
    subtotal_cents: priced.subtotalCents,
    discount_cents: priced.discountCents,
    shipping_cents: priced.shippingCents,
    total_cents: priced.totalCents,
    reservation_expires_at: expiresAt.toISOString(),
    installments,
    lines: priced.lines.map((l) => ({
      variant_id: l.variantId,
      qty: l.qty,
    })),
    items: priced.lines.map((l) => ({
      variant_id: l.variantId,
      product_name: l.productName,
      color: l.color,
      size: l.size,
      unit_price_cents: l.unitPriceCents,
      qty: l.qty,
      sku: l.sku,
    })),
  };

  const { data, error } = await deps.db.rpc("place_order_tx", {
    p: payload as unknown as Json,
  });

  if (error) mapRpcError(error);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new DomainError("VALIDATION_ERROR", "place_order_tx returned invalid payload");
  }

  const order = data as unknown as Omit<PlaceOrderResult, "payment_link" | "link_error"> & {
    installments?: number;
  };

  let payment_link: string | null = null;
  let link_error: PlaceOrderResult["link_error"] = null;

  if (order.payment_method === "payway") {
    const siteTransactionId = order.id;
    await deps.db
      .from("orders")
      .update({
        payway_site_transaction_id: siteTransactionId,
        payway_link_attempt: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const app = baseUrl(deps.appBaseUrl);
    // Payway checkout rejects success/cancel URLs longer than 100 chars (misleading cancel_url error).
    const returnUrl = `${app}/pedido?code=${encodeURIComponent(order.code)}`;

    try {
      const link = await deps.payway.createCheckoutLink({
        siteTransactionId,
        amountCents: order.total_cents,
        currency: "ARS",
    installments,
        description: `Pedido ${order.code}`,
        customerEmail: order.email,
        successUrl: returnUrl,
        cancelUrl: returnUrl,
        notificationsUrl: `${app}/api/payway/notifications`,
        products: priced.lines.map((l) => ({
          id: l.variantId,
          quantity: l.qty,
          valueCents: l.unitPriceCents * l.qty,
          description: `${l.productName} ${l.color} ${l.size}`.trim(),
        })),
      });
      payment_link = link.paymentLink;
      if (link.paywayPaymentId) {
        await deps.db
          .from("orders")
          .update({
            payway_payment_id: link.paywayPaymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }
    } catch (e) {
      if (e instanceof DomainError && e.code === "PAYWAY_CONFIG_MISSING") {
        link_error = "PAYWAY_CONFIG_MISSING";
      } else {
        link_error = "PAYWAY_LINK_FAILED";
      }
    }
  }

  let transferCbuAlias = "";
  if (order.payment_method === "transfer") {
    transferCbuAlias =
      (settings as { transfer_cbu_alias_text?: string }).transfer_cbu_alias_text ?? "";
  }

  try {
    await deps.email.send({
      template: "order_created",
      to: order.email,
      data: {
        orderId: order.id,
        code: order.code,
        accessToken: order.access_token,
        totalCents: order.total_cents,
        paymentMethod: order.payment_method,
        shippingMethod: order.shipping_method,
        transferCbuAlias,
      },
    });
  } catch {
    // best-effort; order already committed
  }

  await sendAdminPushBestEffort(
    deps.push,
    orderCreatedPayload({
      orderId: order.id,
      code: order.code,
      totalCents: order.total_cents,
      paymentMethod: order.payment_method,
    }),
  );

  await notifyLowStockBestEffort(deps, priced.lines);

  return {
    ...order,
    payment_link,
    link_error,
  };
}

async function notifyLowStockBestEffort(
  deps: PlaceOrderDeps,
  lines: QuoteLineResult[],
): Promise<void> {
  try {
    for (const line of lines) {
      const before = line.available;
      const after = line.available - line.qty;
      if (!crossedLowStockThreshold(before, after)) continue;
      await sendAdminPushBestEffort(
        deps.push,
        stockLowPayload({
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          color: line.color,
          size: line.size,
          available: after,
        }),
      );
    }
  } catch {
    // best-effort
  }
}

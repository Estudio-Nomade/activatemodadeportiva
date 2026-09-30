import type { Json } from "@/server/db/types";
import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import type { PaymentMethod, ShippingMethod } from "@/server/domain/pricing/calculate-totals";
import type { EmailPort } from "@/server/email/port";
import { generateAccessToken, generateOrderCode } from "./code";
import { quote, type QuoteLineInput } from "./quote";

export type PlaceOrderInput = {
  customerName: string;
  phone: string;
  email: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  shippingAddress: Record<string, unknown> | null;
  lines: QuoteLineInput[];
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
};

export type PlaceOrderDeps = {
  db: ServiceClient;
  email: EmailPort;
  now?: Date;
};

export async function placeOrder(
  input: PlaceOrderInput,
  deps: PlaceOrderDeps,
): Promise<PlaceOrderResult> {
  if (!input.customerName?.trim() || !input.phone?.trim() || !input.email?.trim()) {
    throw new DomainError("VALIDATION_ERROR", "Customer contact fields are required");
  }

  const priced = await quote(
    {
      lines: input.lines,
      paymentMethod: input.paymentMethod,
      shippingMethod: input.shippingMethod,
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
    lines: input.lines.map((l) => ({
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
    })),
  };

  const { data, error } = await deps.db.rpc("place_order_tx", {
    p: payload as unknown as Json,
  });

  if (error) {
    if (
      error.message.includes("STOCK_INSUFFICIENT") ||
      error.code === "P0001" ||
      error.details?.includes("STOCK_INSUFFICIENT")
    ) {
      throw new DomainError("STOCK_INSUFFICIENT", "Insufficient stock");
    }
    throw new DomainError("VALIDATION_ERROR", error.message);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new DomainError("VALIDATION_ERROR", "place_order_tx returned invalid payload");
  }

  const order = data as unknown as PlaceOrderResult;

  try {
    await deps.email.send({
      template: "order_created",
      to: order.email,
      data: {
        orderId: order.id,
        code: order.code,
        accessToken: order.access_token,
        totalCents: order.total_cents,
      },
    });
  } catch {
    // best-effort; order already committed
  }

  return order;
}

import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import {
  calculateTotals,
  type PaymentMethod,
  type ShippingMethod,
} from "@/server/domain/pricing/calculate-totals";
import { assertLinesInStock, availableStock } from "@/server/domain/stock/availability";
import { assertShippingAddress } from "./address";
import { mergeLinesByVariant } from "./merge-lines";

export type QuoteLineInput = {
  variantId: string;
  qty: number;
};

export type QuoteInput = {
  lines: QuoteLineInput[];
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  shippingAddress?: Record<string, unknown> | null;
};

export type QuoteLineResult = {
  variantId: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  sku: string | null;
  unitPriceCents: number;
  qty: number;
  available: number;
};

export type QuoteResult = {
  lines: QuoteLineResult[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

type VariantRow = {
  id: string;
  product_id: string;
  color: string;
  size: string;
  sku: string | null;
  stock_on_hand: number;
  products: {
    id: string;
    name: string;
    list_price_cents: number;
    promo_price_cents: number | null;
    is_published: boolean;
  } | null;
};

export async function quote(
  input: QuoteInput,
  deps: { db: ServiceClient },
): Promise<QuoteResult> {
  if (!input.lines.length) {
    throw new DomainError("VALIDATION_ERROR", "At least one line is required");
  }

  assertShippingAddress(input.shippingMethod, input.shippingAddress ?? null);

  const lines = mergeLinesByVariant(input.lines);

  const { data: settings, error: settingsError } = await deps.db
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settingsError || !settings) {
    throw new DomainError("VALIDATION_ERROR", "Store settings not found");
  }

  const variantIds = lines.map((l) => l.variantId);
  const { data: variants, error: variantsError } = await deps.db
    .from("product_variants")
    .select(
      "id, product_id, color, size, sku, stock_on_hand, products(id, name, list_price_cents, promo_price_cents, is_published)",
    )
    .in("id", variantIds);

  if (variantsError) {
    throw new DomainError("VALIDATION_ERROR", variantsError.message);
  }

  const variantMap = new Map((variants as VariantRow[] | null)?.map((v) => [v.id, v]) ?? []);

  const { data: reservations } = await deps.db
    .from("stock_reservations")
    .select("variant_id, qty")
    .in("variant_id", variantIds)
    .eq("status", "active");

  const reservedByVariant = new Map<string, number>();
  for (const r of reservations ?? []) {
    reservedByVariant.set(
      r.variant_id,
      (reservedByVariant.get(r.variant_id) ?? 0) + r.qty,
    );
  }

  const quoteLines: QuoteLineResult[] = [];
  const stockCheck: { variantId: string; qty: number; available: number }[] = [];

  for (const line of lines) {
    const variant = variantMap.get(line.variantId);
    if (!variant || !variant.products) {
      throw new DomainError("VALIDATION_ERROR", `Variant not found: ${line.variantId}`);
    }
    if (!variant.products.is_published) {
      throw new DomainError("VALIDATION_ERROR", `Product not available: ${line.variantId}`);
    }

    const reserved = reservedByVariant.get(line.variantId) ?? 0;
    const available = availableStock(variant.stock_on_hand, reserved);
    const unitPriceCents =
      variant.products.promo_price_cents ?? variant.products.list_price_cents;

    quoteLines.push({
      variantId: variant.id,
      productId: variant.products.id,
      productName: variant.products.name,
      color: variant.color,
      size: variant.size,
      sku: variant.sku ?? null,
      unitPriceCents,
      qty: line.qty,
      available,
    });

    stockCheck.push({
      variantId: line.variantId,
      qty: line.qty,
      available,
    });
  }

  assertLinesInStock(stockCheck);

  const totals = calculateTotals({
    lines: quoteLines.map((l) => ({
      unitPriceCents: l.unitPriceCents,
      qty: l.qty,
    })),
    paymentMethod: input.paymentMethod,
    shippingMethod: input.shippingMethod,
    paymentDiscountBps: settings.payment_discount_bps,
    andreaniFeeCents: settings.andreani_fee_cents,
    freeShippingThresholdCents: settings.free_shipping_threshold_cents,
  });

  return {
    lines: quoteLines,
    ...totals,
  };
}

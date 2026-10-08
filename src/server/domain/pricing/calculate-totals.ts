import { DomainError } from "../errors";

export type PaymentMethod = "payway" | "transfer" | "cash";
export type ShippingMethod = "pickup" | "andreani";

export type CalculateTotalsInput = {
  lines: { unitPriceCents: number; qty: number }[];
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  paymentDiscountBps: number;
  andreaniFeeCents: number;
  freeShippingThresholdCents: number;
};

export type CalculateTotalsResult = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

export function calculateTotals(input: CalculateTotalsInput): CalculateTotalsResult {
  if (input.paymentMethod === "cash" && input.shippingMethod !== "pickup") {
    throw new DomainError(
      "INVALID_PAYMENT_SHIPPING_COMBO",
      "Cash payment requires pickup shipping",
    );
  }

  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.qty,
    0,
  );

  const discountCents =
    input.paymentMethod === "payway"
      ? 0
      : Math.floor((subtotalCents * input.paymentDiscountBps) / 10_000);

  let shippingCents = 0;
  if (input.shippingMethod !== "pickup") {
    const baseAfterDiscount = subtotalCents - discountCents;
    shippingCents =
      baseAfterDiscount >= input.freeShippingThresholdCents ? 0 : input.andreaniFeeCents;
  }

  const totalCents = subtotalCents - discountCents + shippingCents;

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
  };
}

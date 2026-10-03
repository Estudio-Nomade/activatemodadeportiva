import { calculateTotals } from "@/server/domain/pricing/calculate-totals";

export type ShippingEstimateInput = {
  unitPriceCents: number;
  qty: number;
  paymentDiscountBps: number;
  andreaniFeeCents: number;
  freeShippingThresholdCents: number;
};

export type ShippingEstimate = {
  pickupCents: 0;
  andreaniCents: number;
  freeShippingReached: boolean;
  centsToFreeShipping: number;
  subtotalAfterDiscountCents: number;
};

/** Preview only — same math as checkout; final total confirmed server-side. */
export function estimateShipping(input: ShippingEstimateInput): ShippingEstimate {
  const qty = Math.max(1, Math.floor(input.qty));
  const lines = [{ unitPriceCents: input.unitPriceCents, qty }];

  const withAndreani = calculateTotals({
    lines,
    paymentMethod: "transfer",
    shippingMethod: "andreani",
    paymentDiscountBps: input.paymentDiscountBps,
    andreaniFeeCents: input.andreaniFeeCents,
    freeShippingThresholdCents: input.freeShippingThresholdCents,
  });

  const subtotalAfterDiscountCents =
    withAndreani.subtotalCents - withAndreani.discountCents;
  const freeShippingReached = withAndreani.shippingCents === 0;
  const centsToFreeShipping = freeShippingReached
    ? 0
    : Math.max(0, input.freeShippingThresholdCents - subtotalAfterDiscountCents);

  return {
    pickupCents: 0,
    andreaniCents: withAndreani.shippingCents,
    freeShippingReached,
    centsToFreeShipping,
    subtotalAfterDiscountCents,
  };
}

import { describe, expect, it } from "vitest";
import { estimateShipping } from "./estimate-shipping";

describe("estimateShipping", () => {
  const base = {
    unitPriceCents: 10_000,
    qty: 1,
    paymentDiscountBps: 1000,
    andreaniFeeCents: 3500,
    freeShippingThresholdCents: 50_000,
  };

  it("charges andreani fee when under threshold after discount", () => {
    const r = estimateShipping(base);
    // 10000 - 10% = 9000 < 50000
    expect(r.andreaniCents).toBe(3500);
    expect(r.freeShippingReached).toBe(false);
    expect(r.pickupCents).toBe(0);
    expect(r.centsToFreeShipping).toBe(41_000);
  });

  it("free andreani when qty pushes past threshold after discount", () => {
    const r = estimateShipping({ ...base, qty: 6 });
    // 60000 - 10% = 54000 >= 50000
    expect(r.andreaniCents).toBe(0);
    expect(r.freeShippingReached).toBe(true);
    expect(r.centsToFreeShipping).toBe(0);
  });
});

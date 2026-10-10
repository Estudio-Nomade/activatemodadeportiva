import { describe, expect, it } from "vitest";
import { calculateTotals } from "./calculate-totals";
import { DomainError } from "../errors";

describe("calculateTotals", () => {
  it("payway: no payment discount; andreani fee under threshold", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 1_000_000, qty: 1 }],
      paymentMethod: "payway",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000, // ignored for payway
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.subtotalCents).toBe(1_000_000);
    expect(result.discountCents).toBe(0);
    expect(result.shippingCents).toBe(450_000);
    expect(result.totalCents).toBe(1_450_000);
  });

  it("payway: free andreani when subtotal >= threshold (no discount)", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 8_000_000, qty: 1 }],
      paymentMethod: "payway",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.discountCents).toBe(0);
    expect(result.shippingCents).toBe(0);
    expect(result.totalCents).toBe(8_000_000);
  });

  it("payway + pickup: shipping 0", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 500_000, qty: 2 }],
      paymentMethod: "payway",
      shippingMethod: "pickup",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.shippingCents).toBe(0);
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(1_000_000);
  });

  it("applies 10% discount only on products for transfer; andreani fee when under threshold", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 1_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.subtotalCents).toBe(1_000_000);
    expect(result.discountCents).toBe(100_000);
    expect(result.shippingCents).toBe(450_000);
    expect(result.totalCents).toBe(1_000_000 - 100_000 + 450_000);
  });

  it("grants free andreani shipping when post-discount base >= threshold (transfer)", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 10_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.shippingCents).toBe(0);
    expect(result.totalCents).toBe(10_000_000 - 1_000_000);
  });

  it("pickup shipping is always zero", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 500_000, qty: 2 }],
      paymentMethod: "cash",
      shippingMethod: "pickup",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.shippingCents).toBe(0);
  });

  it("rejects cash + andreani", () => {
    expect(() =>
      calculateTotals({
        lines: [{ unitPriceCents: 100, qty: 1 }],
        paymentMethod: "cash",
        shippingMethod: "andreani",
        paymentDiscountBps: 1000,
        andreaniFeeCents: 450_000,
        freeShippingThresholdCents: 8_000_000,
      }),
    ).toThrow(DomainError);
  });

  it("andreani_sucursal: same fee as andreani under threshold", () => {
    const home = calculateTotals({
      lines: [{ unitPriceCents: 1_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    const branch = calculateTotals({
      lines: [{ unitPriceCents: 1_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani_sucursal",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(branch.shippingCents).toBe(home.shippingCents);
    expect(branch.shippingCents).toBe(450_000);
    expect(branch.totalCents).toBe(home.totalCents);
  });

  it("andreani_sucursal: free shipping when post-discount base >= threshold", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 10_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani_sucursal",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.shippingCents).toBe(0);
  });

  it("rejects cash + andreani_sucursal", () => {
    expect(() =>
      calculateTotals({
        lines: [{ unitPriceCents: 100, qty: 1 }],
        paymentMethod: "cash",
        shippingMethod: "andreani_sucursal",
        paymentDiscountBps: 1000,
        andreaniFeeCents: 450_000,
        freeShippingThresholdCents: 8_000_000,
      }),
    ).toThrow(DomainError);
  });
});

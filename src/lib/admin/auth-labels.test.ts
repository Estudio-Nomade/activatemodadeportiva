import { describe, expect, it } from "vitest";
import { paymentMethodLabel, shippingMethodLabel } from "./auth";

describe("paymentMethodLabel", () => {
  it("maps known methods to Spanish", () => {
    expect(paymentMethodLabel("transfer")).toBe("Transferencia");
    expect(paymentMethodLabel("cash")).toBe("Efectivo");
    expect(paymentMethodLabel("payway")).toBe("Payway");
  });

  it("falls back for unknown / empty", () => {
    expect(paymentMethodLabel(undefined)).toBe("—");
    expect(paymentMethodLabel("crypto")).toBe("crypto");
  });
});

describe("shippingMethodLabel", () => {
  it("maps known methods to Spanish", () => {
    expect(shippingMethodLabel("pickup")).toBe("Retiro en local");
    expect(shippingMethodLabel("andreani")).toBe("Andreani");
  });
});

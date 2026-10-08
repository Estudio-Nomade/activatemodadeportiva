import { describe, expect, it } from "vitest";
import { centsToPaywayAmount, paywayAmountToCents } from "./amount";

describe("payway amount", () => {
  it("converts cents to pesos", () => {
    expect(centsToPaywayAmount(125045)).toBe(1250.45);
    expect(centsToPaywayAmount(10000)).toBe(100);
    expect(paywayAmountToCents(1250.45)).toBe(125045);
    expect(paywayAmountToCents(100)).toBe(10000);
  });

  it("rejects invalid cents", () => {
    expect(() => centsToPaywayAmount(-1)).toThrow();
    expect(() => centsToPaywayAmount(1.5)).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { centsToPaywayAmount, paywayAmountToCents } from "./amount";

describe("payway amount", () => {
  it("passes cents through", () => {
    expect(centsToPaywayAmount(125045)).toBe(125045);
    expect(paywayAmountToCents(125045)).toBe(125045);
  });

  it("rejects invalid cents", () => {
    expect(() => centsToPaywayAmount(-1)).toThrow();
    expect(() => centsToPaywayAmount(1.5)).toThrow();
  });
});

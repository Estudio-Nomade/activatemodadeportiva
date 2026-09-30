import { describe, expect, it } from "vitest";
import { availableStock, assertLinesInStock } from "./availability";
import { DomainError } from "../errors";

describe("availableStock", () => {
  it("subtracts active reserved qty from on hand", () => {
    expect(availableStock(10, 3)).toBe(7);
  });

  it("can return zero", () => {
    expect(availableStock(5, 5)).toBe(0);
  });

  it("can return negative when over-reserved", () => {
    expect(availableStock(2, 5)).toBe(-3);
  });
});

describe("assertLinesInStock", () => {
  it("passes when all lines fit available stock", () => {
    expect(() =>
      assertLinesInStock([
        { variantId: "v1", qty: 2, available: 5 },
        { variantId: "v2", qty: 1, available: 1 },
      ]),
    ).not.toThrow();
  });

  it("throws STOCK_INSUFFICIENT when qty exceeds available", () => {
    expect(() =>
      assertLinesInStock([{ variantId: "sku-42", qty: 3, available: 2 }]),
    ).toThrow(DomainError);

    try {
      assertLinesInStock([{ variantId: "sku-42", qty: 3, available: 2 }]);
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("STOCK_INSUFFICIENT");
      expect((e as Error).message).toContain("sku-42");
    }
  });
});

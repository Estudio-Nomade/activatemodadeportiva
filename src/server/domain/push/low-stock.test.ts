import { describe, expect, it } from "vitest";
import { crossedLowStockThreshold } from "./low-stock";

describe("crossedLowStockThreshold", () => {
  it("notifies when crossing from above 2 into <= 2", () => {
    expect(crossedLowStockThreshold(3, 2)).toBe(true);
    expect(crossedLowStockThreshold(5, 0)).toBe(true);
    expect(crossedLowStockThreshold(3, 1)).toBe(true);
  });

  it("does not notify when already low", () => {
    expect(crossedLowStockThreshold(2, 1)).toBe(false);
    expect(crossedLowStockThreshold(1, 0)).toBe(false);
    expect(crossedLowStockThreshold(0, 0)).toBe(false);
  });

  it("does not notify when still above threshold", () => {
    expect(crossedLowStockThreshold(10, 5)).toBe(false);
    expect(crossedLowStockThreshold(4, 3)).toBe(false);
  });
});

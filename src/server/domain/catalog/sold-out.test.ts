import { describe, expect, it } from "vitest";
import { isProductSoldOut } from "./sold-out";

describe("isProductSoldOut", () => {
  it("is sold out when there are no variants", () => {
    expect(isProductSoldOut([])).toBe(true);
  });

  it("is sold out when every variant has available <= 0", () => {
    expect(
      isProductSoldOut([
        { available: 0 },
        { available: 0 },
        { available: -1 },
      ]),
    ).toBe(true);
  });

  it("is not sold out when any variant has available > 0", () => {
    expect(
      isProductSoldOut([
        { available: 0 },
        { available: 2 },
      ]),
    ).toBe(false);
  });
});

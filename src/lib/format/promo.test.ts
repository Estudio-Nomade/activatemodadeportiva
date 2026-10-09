import { describe, expect, it } from "vitest";
import { formatPromoBarCopy, discountPercentFromBps } from "./promo";

describe("discountPercentFromBps", () => {
  it("converts 1000 bps to 10", () => {
    expect(discountPercentFromBps(1000)).toBe(10);
  });

  it("floors partial percents", () => {
    expect(discountPercentFromBps(1550)).toBe(15);
  });

  it("returns 0 for non-positive", () => {
    expect(discountPercentFromBps(0)).toBe(0);
    expect(discountPercentFromBps(-100)).toBe(0);
  });
});

describe("formatPromoBarCopy", () => {
  it("builds uppercase discount line from bps", () => {
    expect(formatPromoBarCopy(1000)).toBe("10% DE DESCUENTO CON TRANSFERENCIA");
  });

  it("returns empty when discount is zero", () => {
    expect(formatPromoBarCopy(0)).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { isValidArPostalCode, normalizePostalCode } from "./postal-code";

describe("normalizePostalCode", () => {
  it("trims and uppercases", () => {
    expect(normalizePostalCode("  b1900aaa ")).toBe("B1900AAA");
  });
});

describe("isValidArPostalCode", () => {
  it("accepts 4-digit CP", () => {
    expect(isValidArPostalCode("7000")).toBe(true);
    expect(isValidArPostalCode(" 1900 ")).toBe(true);
  });

  it("accepts CPA light form", () => {
    expect(isValidArPostalCode("B1900AAA")).toBe(true);
    expect(isValidArPostalCode("a1234bcd")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidArPostalCode("")).toBe(false);
    expect(isValidArPostalCode("123")).toBe(false);
    expect(isValidArPostalCode("12345")).toBe(false);
    expect(isValidArPostalCode("ABC")).toBe(false);
    expect(isValidArPostalCode("B1900")).toBe(false);
  });
});

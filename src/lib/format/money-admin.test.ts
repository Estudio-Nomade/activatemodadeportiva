import { describe, expect, it } from "vitest";
import { centsToPesosInput, formatArsCents, pesosToCents } from "./money";

describe("pesosToCents", () => {
  it("treats plain integers as pesos (10000 → $10.000)", () => {
    expect(pesosToCents("10000")).toBe(1_000_000);
  });

  it("accepts AR thousand dots", () => {
    expect(pesosToCents("10.000")).toBe(1_000_000);
    expect(pesosToCents("1.250.000")).toBe(125_000_000);
  });

  it("accepts AR decimal comma", () => {
    expect(pesosToCents("10000,50")).toBe(1_000_050);
    expect(pesosToCents("10.000,5")).toBe(1_000_050);
  });

  it("accepts US-style decimal dot on non-grouped numbers", () => {
    expect(pesosToCents("10000.5")).toBe(1_000_050);
  });

  it("strips $ and spaces", () => {
    expect(pesosToCents("$ 10.000")).toBe(1_000_000);
  });

  it("returns 0 for empty or invalid", () => {
    expect(pesosToCents("")).toBe(0);
    expect(pesosToCents("abc")).toBe(0);
    expect(pesosToCents("-10")).toBe(0);
  });
});

describe("centsToPesosInput", () => {
  it("shows whole pesos without trailing decimals", () => {
    expect(centsToPesosInput(1_000_000)).toBe("10000");
    expect(centsToPesosInput(0)).toBe("0");
  });

  it("shows cents with AR comma when needed", () => {
    expect(centsToPesosInput(1_000_050)).toBe("10000,50");
    expect(centsToPesosInput(105)).toBe("1,05");
  });

  it("round-trips with pesosToCents", () => {
    for (const c of [0, 100, 1_000_000, 1_000_050, 450_000]) {
      expect(pesosToCents(centsToPesosInput(c))).toBe(c);
    }
  });
});

describe("admin preview", () => {
  it("formatArsCents matches typed pesos", () => {
    expect(formatArsCents(pesosToCents("10000"))).toMatch(/10\.000/);
  });
});

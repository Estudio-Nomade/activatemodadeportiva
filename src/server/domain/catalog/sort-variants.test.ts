import { describe, expect, it } from "vitest";
import { compareSizes, sortVariantsBySize } from "./sort-variants";

const sorted = (sizes: string[]) => [...sizes].sort(compareSizes);

describe("compareSizes", () => {
  it("orders letter+number sizes small to large", () => {
    expect(sorted(["xl40", "m38", "s26"])).toEqual(["s26", "m38", "xl40"]);
  });
  it("orders plain letters including 2XL/3XL", () => {
    expect(sorted(["XL", "3XL", "S", "2XL", "M", "L", "XS"])).toEqual([
      "XS", "S", "M", "L", "XL", "2XL", "3XL",
    ]);
  });
  it("orders numbers numerically, after letters, unknown last", () => {
    expect(sorted(["Único", "42", "M", "8", "40"])).toEqual(["M", "8", "40", "42", "Único"]);
  });
});

describe("sortVariantsBySize", () => {
  it("keeps colors grouped and sorts sizes within each", () => {
    const out = sortVariantsBySize([
      { color: "Negro", size: "XL" },
      { color: "Rojo", size: "S" },
      { color: "Negro", size: "S" },
      { color: "Rojo", size: "M" },
    ]);
    expect(out.map((v) => `${v.color}/${v.size}`)).toEqual([
      "Negro/S", "Negro/XL", "Rojo/S", "Rojo/M",
    ]);
  });
});

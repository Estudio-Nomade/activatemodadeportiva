import { describe, expect, it } from "vitest";
import { DomainError } from "@/server/domain/errors";
import { mergeLinesByVariant } from "./merge-lines";

describe("mergeLinesByVariant", () => {
  it("sums qty for the same variantId", () => {
    expect(
      mergeLinesByVariant([
        { variantId: "a", qty: 3 },
        { variantId: "b", qty: 1 },
        { variantId: "a", qty: 2 },
      ]),
    ).toEqual([
      { variantId: "a", qty: 5 },
      { variantId: "b", qty: 1 },
    ]);
  });

  it("rejects non-positive qty", () => {
    expect(() => mergeLinesByVariant([{ variantId: "a", qty: 0 }])).toThrow(DomainError);
  });
});

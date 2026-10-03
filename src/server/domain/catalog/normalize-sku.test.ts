import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { normalizeSku } from "./normalize-sku";

describe("normalizeSku", () => {
  it("trims and nulls empty", () => {
    expect(normalizeSku(null)).toBeNull();
    expect(normalizeSku(undefined)).toBeNull();
    expect(normalizeSku("")).toBeNull();
    expect(normalizeSku("   ")).toBeNull();
    expect(normalizeSku("  ABC-12  ")).toBe("ABC-12");
  });

  it("rejects overlong codes", () => {
    expect(() => normalizeSku("x".repeat(65))).toThrow(TRPCError);
  });
});

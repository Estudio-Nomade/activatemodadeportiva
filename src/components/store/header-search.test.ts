import { describe, expect, it } from "vitest";
import { buildSearchHref } from "./header-search";

describe("buildSearchHref", () => {
  it("returns /buscar when empty", () => {
    expect(buildSearchHref("")).toBe("/buscar");
    expect(buildSearchHref("   ")).toBe("/buscar");
  });

  it("encodes query in q param", () => {
    expect(buildSearchHref("calza")).toBe("/buscar?q=calza");
    expect(buildSearchHref("  remera negra  ")).toBe(
      `/buscar?q=${encodeURIComponent("remera negra")}`,
    );
  });
});

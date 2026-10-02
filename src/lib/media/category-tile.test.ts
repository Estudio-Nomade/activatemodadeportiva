import { describe, expect, it } from "vitest";
import { categoryTileImageSrc } from "./category-tile";

describe("categoryTileImageSrc", () => {
  it("maps known root slugs to static public paths", () => {
    expect(categoryTileImageSrc("mujer")).toBe("/categories/mujer-tile.jpg");
    expect(categoryTileImageSrc("hombre")).toBe("/categories/hombre-tile.jpg");
    expect(categoryTileImageSrc("accesorios")).toBe("/categories/accesorios-products.jpg");
  });

  it("falls back for unknown slugs", () => {
    expect(categoryTileImageSrc("otra")).toBe("/categories/fallback.jpg");
    expect(categoryTileImageSrc("")).toBe("/categories/fallback.jpg");
  });
});

import { describe, expect, it } from "vitest";
import {
  categoriesMatchingQuery,
  productCategoryIdsForSearch,
} from "./search-match";

const cats = [
  { id: "acc", name: "Accesorios", slug: "accesorios", parent_id: null },
  { id: "medias", name: "Medias", slug: "accesorios-medias", parent_id: "acc" },
  { id: "bolsos", name: "Bolsos", slug: "accesorios-bolsos", parent_id: "acc" },
  { id: "mujer", name: "Mujer", slug: "mujer", parent_id: null },
  { id: "calzas", name: "Calzas largas", slug: "mujer-calzas-largas", parent_id: "mujer" },
];

describe("categoriesMatchingQuery", () => {
  it("matches category name case-insensitively", () => {
    const hit = categoriesMatchingQuery(cats, "medias");
    expect(hit.map((c) => c.slug)).toEqual(["accesorios-medias"]);
  });

  it("matches partial name and slug", () => {
    expect(categoriesMatchingQuery(cats, "CALZA").map((c) => c.id)).toEqual(["calzas"]);
    expect(categoriesMatchingQuery(cats, "accesorios-bolsos").map((c) => c.id)).toEqual([
      "bolsos",
    ]);
  });

  it("returns empty for blank query", () => {
    expect(categoriesMatchingQuery(cats, "   ")).toEqual([]);
  });
});

describe("productCategoryIdsForSearch", () => {
  it("expands matched roots to subtree ids", () => {
    const matched = categoriesMatchingQuery(cats, "accesorios");
    const ids = productCategoryIdsForSearch(cats, matched).sort();
    expect(ids).toEqual(["acc", "bolsos", "medias"].sort());
  });

  it("for a leaf returns only that leaf", () => {
    const matched = categoriesMatchingQuery(cats, "medias");
    expect(productCategoryIdsForSearch(cats, matched)).toEqual(["medias"]);
  });
});

import { describe, expect, it } from "vitest";
import { buildCategoryChips } from "./category-chips";

type Cat = { id: string; name: string; slug: string; parent_id: string | null; sort_order: number };

const cats: Cat[] = [
  { id: "r1", name: "Mujer", slug: "mujer", parent_id: null, sort_order: 1 },
  { id: "r2", name: "Hombre", slug: "hombre", parent_id: null, sort_order: 2 },
  { id: "c1", name: "Calzas", slug: "mujer-calzas", parent_id: "r1", sort_order: 2 },
  { id: "c2", name: "Tops", slug: "mujer-tops", parent_id: "r1", sort_order: 1 },
  { id: "c3", name: "Shorts", slug: "hombre-shorts", parent_id: "r2", sort_order: 1 },
];

describe("buildCategoryChips", () => {
  it("for a root category returns Todas + children sorted", () => {
    const chips = buildCategoryChips(cats, "mujer");
    expect(chips.map((c) => c.slug)).toEqual(["mujer", "mujer-tops", "mujer-calzas"]);
    expect(chips[0]?.label).toBe("Todas");
    expect(chips[0]?.active).toBe(true);
    expect(chips[1]?.active).toBe(false);
  });

  it("for a child category returns Todas (parent) + siblings with child active", () => {
    const chips = buildCategoryChips(cats, "mujer-calzas");
    expect(chips.map((c) => c.slug)).toEqual(["mujer", "mujer-tops", "mujer-calzas"]);
    expect(chips.find((c) => c.slug === "mujer-calzas")?.active).toBe(true);
    expect(chips[0]?.active).toBe(false);
  });

  it("returns empty when slug unknown", () => {
    expect(buildCategoryChips(cats, "nope")).toEqual([]);
  });

  it("returns empty for root with no children", () => {
    const lonely: Cat[] = [{ id: "x", name: "Solo", slug: "solo", parent_id: null, sort_order: 1 }];
    expect(buildCategoryChips(lonely, "solo")).toEqual([]);
  });
});

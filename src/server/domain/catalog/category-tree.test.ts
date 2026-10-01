import { describe, expect, it } from "vitest";
import { categoryIdsInSubtree } from "./category-tree";

type Cat = { id: string; parent_id: string | null };

const tree: Cat[] = [
  { id: "mujer", parent_id: null },
  { id: "hombre", parent_id: null },
  { id: "calzas", parent_id: "mujer" },
  { id: "tops", parent_id: "mujer" },
  { id: "deep", parent_id: "calzas" },
];

describe("categoryIdsInSubtree", () => {
  it("includes self and all descendants", () => {
    expect(categoryIdsInSubtree(tree, "mujer").sort()).toEqual(
      ["calzas", "deep", "mujer", "tops"].sort(),
    );
  });

  it("for a leaf returns only itself", () => {
    expect(categoryIdsInSubtree(tree, "deep")).toEqual(["deep"]);
  });

  it("returns empty for unknown id", () => {
    expect(categoryIdsInSubtree(tree, "nope")).toEqual([]);
  });
});

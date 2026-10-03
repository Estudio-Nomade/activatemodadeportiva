import { describe, expect, it } from "vitest";
import {
  leafCategoriesForCare,
  normalizeCompositionCareText,
  shouldShowCompositionCare,
} from "./composition-care";

describe("normalizeCompositionCareText", () => {
  it("trims and returns empty for whitespace-only", () => {
    expect(normalizeCompositionCareText("  \n\t ")).toBe("");
    expect(normalizeCompositionCareText(null)).toBe("");
    expect(normalizeCompositionCareText(undefined)).toBe("");
  });

  it("preserves inner newlines after trim", () => {
    expect(normalizeCompositionCareText("  80% poliéster\n20% elastano  ")).toBe(
      "80% poliéster\n20% elastano",
    );
  });
});

describe("shouldShowCompositionCare", () => {
  it("is false when empty", () => {
    expect(shouldShowCompositionCare("")).toBe(false);
    expect(shouldShowCompositionCare("   ")).toBe(false);
  });

  it("is true when non-empty text", () => {
    expect(shouldShowCompositionCare("Lavar frío")).toBe(true);
  });
});

describe("leafCategoriesForCare", () => {
  const rows = [
    { id: "p1", name: "Mujer", slug: "mujer", parent_id: null, composition_care_text: "" },
    {
      id: "l1",
      name: "Calzas largas",
      slug: "mujer-calzas-largas",
      parent_id: "p1",
      composition_care_text: "care A",
    },
    {
      id: "l2",
      name: "Shorts",
      slug: "mujer-shorts",
      parent_id: "p1",
      composition_care_text: "",
    },
    { id: "p2", name: "Hombre", slug: "hombre", parent_id: null, composition_care_text: "ignored" },
    {
      id: "l3",
      name: "Remeras",
      slug: "hombre-remeras",
      parent_id: "p2",
      composition_care_text: "",
    },
  ];

  it("returns only leaves with parent name and care text", () => {
    const leaves = leafCategoriesForCare(rows);
    expect(leaves.map((l) => l.id).sort()).toEqual(["l1", "l2", "l3"]);
    const calzas = leaves.find((l) => l.id === "l1");
    expect(calzas).toMatchObject({
      id: "l1",
      name: "Calzas largas",
      parentName: "Mujer",
      composition_care_text: "care A",
      isLeaf: true,
    });
  });

  it("excludes parents even if they have care text", () => {
    const leaves = leafCategoriesForCare(rows);
    expect(leaves.find((l) => l.id === "p1")).toBeUndefined();
    expect(leaves.find((l) => l.id === "p2")).toBeUndefined();
  });
});

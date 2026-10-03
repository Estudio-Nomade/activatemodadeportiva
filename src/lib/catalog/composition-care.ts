export function normalizeCompositionCareText(
  raw: string | null | undefined,
): string {
  if (raw == null) return "";
  return raw.trim();
}

export function shouldShowCompositionCare(
  raw: string | null | undefined,
): boolean {
  return normalizeCompositionCareText(raw).length > 0;
}

export type CategoryCareRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  composition_care_text: string;
};

export type LeafCategoryForCare = CategoryCareRow & {
  parentName: string | null;
  isLeaf: true;
};

/** Categories that have no children — editable care targets. */
export function leafCategoriesForCare(
  rows: CategoryCareRow[],
): LeafCategoryForCare[] {
  const childParentIds = new Set(
    rows.map((r) => r.parent_id).filter((id): id is string => id != null),
  );
  const byId = new Map(rows.map((r) => [r.id, r]));

  return rows
    .filter((r) => !childParentIds.has(r.id))
    .map((r) => ({
      ...r,
      parentName: r.parent_id ? (byId.get(r.parent_id)?.name ?? null) : null,
      isLeaf: true as const,
    }))
    .sort((a, b) => {
      const pa = a.parentName ?? "";
      const pb = b.parentName ?? "";
      if (pa !== pb) return pa.localeCompare(pb, "es");
      return a.name.localeCompare(b.name, "es");
    });
}

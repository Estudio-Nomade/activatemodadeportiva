export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

export type CategoryChip = {
  slug: string;
  label: string;
  active: boolean;
};

/**
 * Subcategory chips for storefront category pages.
 * Root → Todas + children. Child → Todas (parent) + siblings.
 * Empty when no siblings/children to show.
 */
export function buildCategoryChips(
  categories: CategoryRow[],
  activeSlug: string,
): CategoryChip[] {
  const current = categories.find((c) => c.slug === activeSlug);
  if (!current) return [];

  const isRoot = current.parent_id == null;
  const parent = isRoot
    ? current
    : categories.find((c) => c.id === current.parent_id);
  if (!parent) return [];

  const children = categories
    .filter((c) => c.parent_id === parent.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (children.length === 0) return [];

  return [
    {
      slug: parent.slug,
      label: "Todas",
      active: current.id === parent.id,
    },
    ...children.map((c) => ({
      slug: c.slug,
      label: c.name,
      active: c.id === current.id,
    })),
  ];
}

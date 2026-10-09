import { categoryIdsInSubtree } from "./category-tree";

export type SearchCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

/** Categories whose name or slug contains q (case-insensitive). */
export function categoriesMatchingQuery(
  categories: SearchCategory[],
  q: string,
): SearchCategory[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return categories.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) || c.slug.toLowerCase().includes(needle),
  );
}

/** Union of matched category ids + all descendants (for product.category_id filter). */
export function productCategoryIdsForSearch(
  allCategories: { id: string; parent_id: string | null }[],
  matched: { id: string }[],
): string[] {
  const set = new Set<string>();
  for (const m of matched) {
    for (const id of categoryIdsInSubtree(allCategories, m.id)) {
      set.add(id);
    }
  }
  return Array.from(set);
}

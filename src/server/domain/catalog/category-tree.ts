/** Self + all descendant category ids (BFS). Empty if rootId not in list. */
export function categoryIdsInSubtree(
  categories: { id: string; parent_id: string | null }[],
  rootId: string,
): string[] {
  if (!categories.some((c) => c.id === rootId)) return [];

  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    if (c.parent_id == null) continue;
    const list = childrenByParent.get(c.parent_id) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parent_id, list);
  }

  const out: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    for (const child of childrenByParent.get(id) ?? []) {
      queue.push(child);
    }
  }
  return out;
}

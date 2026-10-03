/** Immutable reorder of id list by one step. Returns same array ref if no change. */
export function moveIdInOrder(
  orderedIds: string[],
  id: string,
  direction: "up" | "down",
): string[] {
  const i = orderedIds.indexOf(id);
  if (i < 0) return orderedIds;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= orderedIds.length) return orderedIds;
  const next = orderedIds.slice();
  const tmp = next[i]!;
  next[i] = next[j]!;
  next[j] = tmp;
  return next;
}

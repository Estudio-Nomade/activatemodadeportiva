const LETTER_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"];

/** Normalizes "2XL" / "3xl" style labels into repeated-X form so they rank correctly. */
function normalizeLetters(raw: string): string {
  const m = /^(\d)X(L|S)$/.exec(raw);
  if (!m) return raw;
  return "X".repeat(Number(m[1])) + m[2];
}

type SizeKey = { group: number; letter: number; num: number; text: string };

/**
 * Builds a sort key from free-text sizes such as "S", "XL40", "m38", "2XL", "40", "U".
 * Order: letter sizes (XXS..XXXXL, then by trailing number) → pure numbers → anything else.
 */
export function sizeSortKey(size: string): SizeKey {
  const text = size.trim().toUpperCase();
  const numMatch = /(\d+(?:[.,]\d+)?)\s*$/.exec(text);
  const num = numMatch ? Number(numMatch[1].replace(",", ".")) : Number.NaN;
  const letters = normalizeLetters(text.replace(/[\d.,\s/-]+$/, "").replace(/\s+/g, ""));

  const letterIdx = LETTER_ORDER.indexOf(letters);
  if (letterIdx >= 0) {
    return { group: 0, letter: letterIdx, num: Number.isNaN(num) ? 0 : num, text };
  }
  if (letters === "" && !Number.isNaN(num)) {
    return { group: 1, letter: 0, num, text };
  }
  return { group: 2, letter: 0, num: Number.isNaN(num) ? 0 : num, text };
}

export function compareSizes(a: string, b: string): number {
  const ka = sizeSortKey(a);
  const kb = sizeSortKey(b);
  return (
    ka.group - kb.group ||
    ka.letter - kb.letter ||
    ka.num - kb.num ||
    ka.text.localeCompare(kb.text, "es", { numeric: true })
  );
}

/**
 * Sorts variants by size (small → large). Colors keep their first-appearance order,
 * so each color's sizes stay grouped together.
 */
export function sortVariantsBySize<T extends { color: string; size: string }>(variants: T[]): T[] {
  const colorOrder = new Map<string, number>();
  for (const v of variants) {
    if (!colorOrder.has(v.color)) colorOrder.set(v.color, colorOrder.size);
  }
  return [...variants].sort(
    (a, b) =>
      (colorOrder.get(a.color) ?? 0) - (colorOrder.get(b.color) ?? 0) ||
      compareSizes(a.size, b.size),
  );
}

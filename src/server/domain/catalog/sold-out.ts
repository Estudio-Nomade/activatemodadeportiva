/** True when product has no sellable stock (all variants available <= 0, or none). */
export function isProductSoldOut(variants: { available: number }[]): boolean {
  if (variants.length === 0) return true;
  return variants.every((v) => v.available <= 0);
}

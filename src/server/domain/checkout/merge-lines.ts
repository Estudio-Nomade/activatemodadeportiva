import { DomainError } from "@/server/domain/errors";

export type LineQty = {
  variantId: string;
  qty: number;
};

/** Collapse duplicate variantIds by summing qty. */
export function mergeLinesByVariant(lines: LineQty[]): LineQty[] {
  const map = new Map<string, number>();
  for (const line of lines) {
    if (!line.variantId) {
      throw new DomainError("VALIDATION_ERROR", "variantId is required");
    }
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new DomainError("VALIDATION_ERROR", "Quantity must be a positive integer");
    }
    map.set(line.variantId, (map.get(line.variantId) ?? 0) + line.qty);
  }
  return Array.from(map.entries()).map(([variantId, qty]) => ({ variantId, qty }));
}

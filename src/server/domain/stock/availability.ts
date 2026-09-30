import { DomainError } from "../errors";

export function availableStock(onHand: number, activeReservedQty: number): number {
  return onHand - activeReservedQty;
}

export function assertLinesInStock(
  lines: { variantId: string; qty: number; available: number }[],
): void {
  for (const line of lines) {
    if (line.qty > line.available) {
      throw new DomainError("STOCK_INSUFFICIENT", `Variant ${line.variantId}`);
    }
  }
}

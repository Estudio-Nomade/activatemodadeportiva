const LOW_STOCK_MAX = 2;

/** True only on the edge into the low band (before > 2 and after <= 2). */
export function crossedLowStockThreshold(beforeAvailable: number, afterAvailable: number): boolean {
  return beforeAvailable > LOW_STOCK_MAX && afterAvailable <= LOW_STOCK_MAX;
}

export const LOW_STOCK_THRESHOLD = LOW_STOCK_MAX;

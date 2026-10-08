/** Store integer cents → Payway checkout amount (pesos with 2 decimals). */
export function centsToPaywayAmount(cents: number): number {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("amount must be non-negative integer cents");
  }
  return Math.round(cents) / 100;
}

/** Payway amount (pesos) → store integer cents. */
export function paywayAmountToCents(amount: number): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("invalid Payway amount");
  }
  return Math.round(amount * 100);
}

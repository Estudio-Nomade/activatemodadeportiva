/** Store integer cents → Payway API amount. Validate unit in sandbox before prod. */
export function centsToPaywayAmount(cents: number): number {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("amount must be non-negative integer cents");
  }
  return cents;
}

export function paywayAmountToCents(amount: number): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("invalid Payway amount");
  }
  return Math.round(amount);
}

/** Integer percent from basis points (1000 bps = 10%). */
export function discountPercentFromBps(bps: number): number {
  if (!Number.isFinite(bps) || bps <= 0) return 0;
  return Math.floor(bps / 100);
}

/** Promo bar copy (ES-AR). Empty when no payment discount (Payway checkout). */
export function formatPromoBarCopy(paymentDiscountBps: number): string {
  const pct = discountPercentFromBps(paymentDiscountBps);
  if (pct <= 0) return "";
  return `${pct}% DE DESCUENTO`;
}

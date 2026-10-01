/** Format integer ARS cents as es-AR currency. */
export function formatArsCents(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function unitPriceCents(product: {
  list_price_cents: number;
  promo_price_cents: number | null;
}): number {
  return product.promo_price_cents ?? product.list_price_cents;
}

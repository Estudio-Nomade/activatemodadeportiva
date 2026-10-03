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

/**
 * Parse admin money typed in **pesos** (not cents) → integer cents for the API.
 * Accepts: `10000`, `10.000`, `10.000,50`, `10000,5`, `10000.5`.
 */
export function pesosToCents(raw: string): number {
  const t = raw.trim().replace(/\s/g, "").replace(/\$/g, "");
  if (!t) return 0;

  let normalized = t;
  if (t.includes(",")) {
    // AR: thousands `.` + decimal `,`
    normalized = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // Only thousand separators: 10.000 / 1.250.000
    normalized = t.replace(/\./g, "");
  }
  // else plain `10000` or US-style `10000.5`

  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/**
 * Cents → admin input in pesos. Whole pesos without trailing `.00`
 * so $10.000 se edita como `10000`, no `10000.00` ni centavos crudos.
 */
export function centsToPesosInput(cents: number): string {
  const c = Math.round(Number(cents) || 0);
  if (!Number.isFinite(c)) return "0";
  const whole = Math.trunc(c / 100);
  const frac = Math.abs(c % 100);
  if (frac === 0) return String(whole);
  return `${whole},${String(frac).padStart(2, "0")}`;
}

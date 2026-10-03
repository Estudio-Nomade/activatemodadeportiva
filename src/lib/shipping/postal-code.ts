/** Argentine postal code: 4 digits or CPA `A1234BCD` (light). */
const CPA_RE = /^[A-Za-z]\d{4}[A-Za-z]{3}$/;
const DIGITS_RE = /^\d{4}$/;

export function normalizePostalCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidArPostalCode(raw: string): boolean {
  const v = normalizePostalCode(raw);
  if (!v) return false;
  return DIGITS_RE.test(v) || CPA_RE.test(v);
}

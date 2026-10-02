/** PDP meta lines (Pencil 02) from payment discount percent. */
export function buildPdpMetaChips(discountPercent: number): string[] {
  const pct = Number.isFinite(discountPercent) && discountPercent > 0 ? Math.floor(discountPercent) : 0;
  return [
    `${pct}% off transferencia o efectivo`,
    "Envío Andreani o retiro en San Manuel",
    "Cambios por WhatsApp o en el local",
  ];
}

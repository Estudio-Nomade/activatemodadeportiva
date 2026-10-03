export type RemoveVariantBlock = "HAS_RESERVATIONS" | "HAS_ORDER_ITEMS";

/** Whether a variant may be hard-deleted (reservations RESTRICT; order_items SET NULL but we keep history). */
export function canRemoveVariant(input: {
  reservationCount: number;
  orderItemCount: number;
}): { ok: true } | { ok: false; reason: RemoveVariantBlock } {
  if (input.reservationCount > 0) return { ok: false, reason: "HAS_RESERVATIONS" };
  if (input.orderItemCount > 0) return { ok: false, reason: "HAS_ORDER_ITEMS" };
  return { ok: true };
}

export type RemoveProductBlock = RemoveVariantBlock;

/**
 * Hard-delete product only when no variant is tied to reservations or order lines.
 * product_images / product_variants cascade; stock_reservations RESTRICT on variant.
 */
export function canRemoveProduct(input: {
  reservationCount: number;
  orderItemCount: number;
}): { ok: true } | { ok: false; reason: RemoveProductBlock } {
  return canRemoveVariant(input);
}

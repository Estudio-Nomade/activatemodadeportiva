import type { ServiceClient } from "@/server/db/supabase";
import { availableStock } from "@/server/domain/stock/availability";

export type VariantWithAvailability = {
  id: string;
  color: string;
  size: string;
  stock_on_hand: number;
  available: number;
};

export async function variantsWithAvailability(
  db: ServiceClient,
  variants: { id: string; color: string; size: string; stock_on_hand: number }[],
): Promise<VariantWithAvailability[]> {
  if (!variants.length) return [];

  const ids = variants.map((v) => v.id);
  const { data: reservations } = await db
    .from("stock_reservations")
    .select("variant_id, qty")
    .in("variant_id", ids)
    .eq("status", "active");

  const reserved = new Map<string, number>();
  for (const r of reservations ?? []) {
    reserved.set(r.variant_id, (reserved.get(r.variant_id) ?? 0) + r.qty);
  }

  return variants.map((v) => ({
    id: v.id,
    color: v.color,
    size: v.size,
    stock_on_hand: v.stock_on_hand,
    available: availableStock(v.stock_on_hand, reserved.get(v.id) ?? 0),
  }));
}

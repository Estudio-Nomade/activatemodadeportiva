import type { ServiceClient } from "@/server/db/supabase";
import type { EmailPort } from "@/server/email/port";
import { cancelOrder } from "./transitions";

export type ExpireReservationsDeps = {
  db: ServiceClient;
  email: EmailPort;
  now?: Date;
};

export type ExpireReservationsResult = {
  expiredCount: number;
  orderIds: string[];
};

export async function expireReservations(
  deps: ExpireReservationsDeps,
): Promise<ExpireReservationsResult> {
  const now = deps.now ?? new Date();

  const { data: orders, error } = await deps.db
    .from("orders")
    .select("id")
    .eq("status", "pendiente_pago")
    .lt("reservation_expires_at", now.toISOString());

  if (error) {
    throw error;
  }

  const orderIds: string[] = [];

  for (const order of orders ?? []) {
    try {
      await cancelOrder(order.id, "expired", {
        db: deps.db,
        email: deps.email,
      });
      orderIds.push(order.id);
    } catch {
      // already cancelled or invalid transition — idempotent skip
    }
  }

  return {
    expiredCount: orderIds.length,
    orderIds,
  };
}

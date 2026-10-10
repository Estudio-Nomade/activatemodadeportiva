import { beforeAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/server/db/supabase";
import { consoleEmail } from "@/server/email/console";
import { placeOrder } from "@/server/domain/checkout/place-order";
import type { PaywayPort } from "@/server/payments/payway/port";
import { consolePush } from "@/server/push/console";
import { expireReservations } from "./expire-reservations";

const VARIANT_L = "33333333-3333-4333-a333-333333333002";

const payway: PaywayPort = {
  async createCheckoutLink() {
    return { paymentLink: "https://example.com/pay", paywayPaymentId: "x" };
  },
  async getPayment() {
    return { status: "approved", amountCents: 0, siteTransactionId: "" };
  },
};

describe("expireReservations", () => {
  beforeAll(async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db
      .from("product_variants")
      .update({ stock_on_hand: 5 })
      .eq("id", VARIANT_L);
  });

  it("cancels pending orders past reservation expiry", async () => {
    const db = createServiceClient();

    const order = await placeOrder(
      {
        customerName: "Expiring",
        phone: "+54933333333",
        email: "expire@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_L, qty: 1 }],
      },
      {
        db,
        email: consoleEmail,
        payway,
        appBaseUrl: "http://localhost:3000",
        push: consolePush,
      },
    );

    const past = new Date(Date.now() - 60_000).toISOString();
    await db
      .from("orders")
      .update({ reservation_expires_at: past })
      .eq("id", order.id);
    await db
      .from("stock_reservations")
      .update({ expires_at: past })
      .eq("order_id", order.id);

    const result = await expireReservations({
      db,
      email: consoleEmail,
      push: consolePush,
      now: new Date(),
    });

    expect(result.expiredCount).toBeGreaterThanOrEqual(1);

    const { data: refreshed } = await db
      .from("orders")
      .select("status, cancel_reason")
      .eq("id", order.id)
      .single();

    expect(refreshed?.status).toBe("cancelado");
    expect(refreshed?.cancel_reason).toBe("expired");

    const { data: reservations } = await db
      .from("stock_reservations")
      .select("status")
      .eq("order_id", order.id);

    expect(reservations?.every((r) => r.status === "released")).toBe(true);

    const again = await expireReservations({
      db,
      email: consoleEmail,
      push: consolePush,
      now: new Date(),
    });
    expect(again.expiredCount).toBe(0);
  });
});

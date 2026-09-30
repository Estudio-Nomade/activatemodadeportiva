import { beforeAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/server/db/supabase";
import { placeOrder } from "@/server/domain/checkout/place-order";
import { consoleEmail } from "@/server/email/console";
import {
  cancelOrder,
  confirmPayment,
  markDelivered,
  markReadyForPickup,
  startPreparing,
} from "./transitions";

const VARIANT_L = "33333333-3333-4333-a333-333333333002";

describe("order transitions", () => {
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

  it("confirmPayment consumes reservation and reduces on_hand", async () => {
    const db = createServiceClient();

    const order = await placeOrder(
      {
        customerName: "Paid Buyer",
        phone: "+54944444444",
        email: "paid@example.com",
        shippingMethod: "pickup",
        paymentMethod: "transfer",
        shippingAddress: null,
        lines: [{ variantId: VARIANT_L, qty: 2 }],
      },
      { db, email: consoleEmail },
    );

    const { data: before } = await db
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", VARIANT_L)
      .single();

    await confirmPayment(order.id, { db, email: consoleEmail });

    const { data: afterOrder } = await db
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .single();
    expect(afterOrder?.status).toBe("pago_confirmado");

    const { data: afterVariant } = await db
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", VARIANT_L)
      .single();
    expect(afterVariant?.stock_on_hand).toBe((before?.stock_on_hand ?? 0) - 2);

    const { data: reservations } = await db
      .from("stock_reservations")
      .select("status")
      .eq("order_id", order.id);
    expect(reservations?.every((r) => r.status === "consumed")).toBe(true);

    await startPreparing(order.id, { db, email: consoleEmail });
    await markReadyForPickup(order.id, { db, email: consoleEmail });
    await markDelivered(order.id, { db, email: consoleEmail });

    const { data: delivered } = await db
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .single();
    expect(delivered?.status).toBe("entregado");
  });

  it("cancel after payment restores stock", async () => {
    const db = createServiceClient();

    const { data: seedVariant } = await db
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", VARIANT_L)
      .single();
    const startStock = seedVariant?.stock_on_hand ?? 0;

    const order = await placeOrder(
      {
        customerName: "Cancel Me",
        phone: "+54955555555",
        email: "cancel@example.com",
        shippingMethod: "pickup",
        paymentMethod: "cash",
        shippingAddress: null,
        lines: [{ variantId: VARIANT_L, qty: 1 }],
      },
      { db, email: consoleEmail },
    );

    await confirmPayment(order.id, { db, email: consoleEmail });

    const { data: mid } = await db
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", VARIANT_L)
      .single();
    expect(mid?.stock_on_hand).toBe(startStock - 1);

    await cancelOrder(order.id, "admin", { db, email: consoleEmail });

    const { data: end } = await db
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", VARIANT_L)
      .single();
    expect(end?.stock_on_hand).toBe(startStock);

    const { data: cancelled } = await db
      .from("orders")
      .select("status, cancel_reason")
      .eq("id", order.id)
      .single();
    expect(cancelled?.status).toBe("cancelado");
    expect(cancelled?.cancel_reason).toBe("admin");
  });
});

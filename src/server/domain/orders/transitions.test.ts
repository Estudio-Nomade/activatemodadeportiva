import { beforeAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/server/db/supabase";
import { placeOrder } from "@/server/domain/checkout/place-order";
import { consoleEmail } from "@/server/email/console";
import type { PaywayPort } from "@/server/payments/payway/port";
import type { PushPort } from "@/server/push/port";
import { consolePush } from "@/server/push/console";
import {
  cancelOrder,
  confirmPayment,
  markDelivered,
  markReadyForPickup,
  startPreparing,
} from "./transitions";

const VARIANT_L = "33333333-3333-4333-a333-333333333002";

const payway: PaywayPort = {
  async createCheckoutLink() {
    return { paymentLink: "https://example.com/pay", paywayPaymentId: "x" };
  },
  async getPayment() {
    return { status: "approved", amountCents: 0, siteTransactionId: "" };
  },
};

const placeDeps = {
  email: consoleEmail,
  payway,
  appBaseUrl: "http://localhost:3000",
  push: consolePush,
};

const transitionDeps = (db: ReturnType<typeof createServiceClient>, push: PushPort = consolePush) => ({
  db,
  email: consoleEmail,
  push,
});

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
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_L, qty: 2 }],
      },
      { db, ...placeDeps },
    );

    const { data: before } = await db
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", VARIANT_L)
      .single();

    await confirmPayment(order.id, transitionDeps(db));

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

    await startPreparing(order.id, transitionDeps(db));
    await markReadyForPickup(order.id, transitionDeps(db));
    await markDelivered(order.id, transitionDeps(db));

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
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_L, qty: 1 }],
      },
      { db, ...placeDeps },
    );

    await confirmPayment(order.id, transitionDeps(db));

    const { data: mid } = await db
      .from("product_variants")
      .select("stock_on_hand")
      .eq("id", VARIANT_L)
      .single();
    expect(mid?.stock_on_hand).toBe(startStock - 1);

    await cancelOrder(order.id, "admin", transitionDeps(db));

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

  it("confirmPayment sends order.payment_confirmed admin push", async () => {
    const db = createServiceClient();
    await db
      .from("product_variants")
      .update({ stock_on_hand: 5 })
      .eq("id", VARIANT_L);

    const order = await placeOrder(
      {
        customerName: "Push Paid",
        phone: "+54999999999",
        email: "pushpaid@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_L, qty: 1 }],
      },
      { db, ...placeDeps },
    );

    const sendToAdmins = vi.fn().mockResolvedValue(undefined);
    const push: PushPort = { sendToAdmins };

    await confirmPayment(order.id, transitionDeps(db, push));

    expect(sendToAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "order.payment_confirmed",
        tag: `order-${order.id}-paid`,
      }),
    );
  });
});

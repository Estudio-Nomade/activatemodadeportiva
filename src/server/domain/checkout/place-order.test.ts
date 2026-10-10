import { beforeAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { consoleEmail } from "@/server/email/console";
import type { PaywayPort } from "@/server/payments/payway/port";
import type { PushPort } from "@/server/push/port";
import { consolePush } from "@/server/push/console";
import { placeOrder } from "./place-order";

const VARIANT_M = "33333333-3333-4333-a333-333333333001";

const paywayOk: PaywayPort = {
  async createCheckoutLink() {
    return {
      paymentLink: "https://developers.decidir.com/web/checkout/test",
      paywayPaymentId: "pw-1",
    };
  },
  async getPayment() {
    return { status: "approved", amountCents: 0, siteTransactionId: "" };
  },
};

const depsBase = {
  email: consoleEmail,
  payway: paywayOk,
  appBaseUrl: "http://localhost:3000",
  push: consolePush,
};

describe("placeOrder", () => {
  beforeAll(async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("product_variants").update({ stock_on_hand: 5 }).eq("id", VARIANT_M);
  });

  it("reserves stock and rejects oversell", async () => {
    const db = createServiceClient();

    const order = await placeOrder(
      {
        customerName: "Test Buyer",
        phone: "+54911111111",
        email: "buyer@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 5 }],
      },
      { db, ...depsBase },
    );

    expect(order.code).toMatch(/^ACT-[A-Z0-9]{10}$/);
    expect(order.status).toBe("pendiente_pago");
    expect(order.total_cents).toBeGreaterThan(0);
    expect(order.discount_cents).toBe(0);
    expect(order.payment_link).toContain("checkout");
    expect(order.link_error).toBeNull();

    await expect(
      placeOrder(
        {
          customerName: "Other",
          phone: "+54922222222",
          email: "other@example.com",
          shippingMethod: "pickup",
          paymentMethod: "payway",
          installments: 1,
          shippingAddress: null,
          lines: [{ variantId: VARIANT_M, qty: 1 }],
        },
        { db, ...depsBase },
      ),
    ).rejects.toMatchObject({
      code: "STOCK_INSUFFICIENT",
      name: "DomainError",
    } satisfies Partial<DomainError>);
  });

  it("rejects split lines that would oversell the same variant", async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("product_variants").update({ stock_on_hand: 5 }).eq("id", VARIANT_M);

    await expect(
      placeOrder(
        {
          customerName: "Split",
          phone: "+54933333333",
          email: "split@example.com",
          shippingMethod: "pickup",
          paymentMethod: "payway",
          installments: 1,
          shippingAddress: null,
          lines: [
            { variantId: VARIANT_M, qty: 3 },
            { variantId: VARIANT_M, qty: 3 },
          ],
        },
        { db, ...depsBase },
      ),
    ).rejects.toMatchObject({ code: "STOCK_INSUFFICIENT" });
  });

  it("requires address for andreani", async () => {
    const db = createServiceClient();
    await expect(
      placeOrder(
        {
          customerName: "Ship",
          phone: "+54933333333",
          email: "ship@example.com",
          shippingMethod: "andreani",
          paymentMethod: "payway",
          installments: 1,
          shippingAddress: null,
          lines: [{ variantId: VARIANT_M, qty: 1 }],
        },
        { db, ...depsBase },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("snapshots variant sku onto order_items", async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db
      .from("product_variants")
      .update({ stock_on_hand: 5, sku: "CALZA-NEG-M" })
      .eq("id", VARIANT_M);

    const order = await placeOrder(
      {
        customerName: "Sku Buyer",
        phone: "+54944444444",
        email: "sku@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 1 }],
      },
      { db, ...depsBase },
    );

    const { data: items, error } = await db
      .from("order_items")
      .select("sku, qty")
      .eq("order_id", order.id);
    expect(error).toBeNull();
    expect(items).toEqual([{ sku: "CALZA-NEG-M", qty: 1 }]);
  });

  it("returns order with link_error when payway fails after commit", async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("product_variants").update({ stock_on_hand: 5 }).eq("id", VARIANT_M);

    const paywayFail: PaywayPort = {
      async createCheckoutLink() {
        throw new DomainError("PAYWAY_LINK_FAILED", "boom");
      },
      async getPayment() {
        return { status: "approved", amountCents: 0, siteTransactionId: "" };
      },
    };

    const order = await placeOrder(
      {
        customerName: "Link Fail",
        phone: "+54955555555",
        email: "fail@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 1 }],
      },
      {
        db,
        email: consoleEmail,
        payway: paywayFail,
        appBaseUrl: "http://localhost:3000",
        push: consolePush,
      },
    );

    expect(order.status).toBe("pendiente_pago");
    expect(order.payment_link).toBeNull();
    expect(order.link_error).toBe("PAYWAY_LINK_FAILED");
  });

  it("sends order.created admin push after success", async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("product_variants").update({ stock_on_hand: 5 }).eq("id", VARIANT_M);

    const sendToAdmins = vi.fn().mockResolvedValue(undefined);
    const push: PushPort = { sendToAdmins };

    const order = await placeOrder(
      {
        customerName: "Push Buyer",
        phone: "+54966666666",
        email: "push@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 1 }],
      },
      { db, ...depsBase, push },
    );

    expect(sendToAdmins).toHaveBeenCalled();
    const created = sendToAdmins.mock.calls.find(
      (c) => c[0]?.event === "order.created",
    );
    expect(created).toBeDefined();
    expect(created![0]).toMatchObject({
      event: "order.created",
      tag: `order-${order.id}-created`,
    });
  });

  it("succeeds when admin push rejects", async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("product_variants").update({ stock_on_hand: 5 }).eq("id", VARIANT_M);

    const push: PushPort = {
      sendToAdmins: vi.fn().mockRejectedValue(new Error("push down")),
    };

    const order = await placeOrder(
      {
        customerName: "Push Fail",
        phone: "+54977777777",
        email: "pushfail@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 1 }],
      },
      { db, ...depsBase, push },
    );

    expect(order.status).toBe("pendiente_pago");
    expect(order.code).toMatch(/^ACT-/);
  });

  it("sends stock.low when reservation crosses low-stock threshold", async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    // before=5, after=1 → crosses into ≤2
    await db.from("product_variants").update({ stock_on_hand: 5 }).eq("id", VARIANT_M);

    const sendToAdmins = vi.fn().mockResolvedValue(undefined);
    const push: PushPort = { sendToAdmins };

    await placeOrder(
      {
        customerName: "Low Stock",
        phone: "+54988888888",
        email: "low@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 4 }],
      },
      { db, ...depsBase, push },
    );

    const low = sendToAdmins.mock.calls.find((c) => c[0]?.event === "stock.low");
    expect(low).toBeDefined();
    expect(low![0]).toMatchObject({
      event: "stock.low",
      tag: `stock-${VARIANT_M}`,
    });
  });

  it("does not send stock.low when already at or below threshold", async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    // already low: available = 2, buy 1 → still low, no edge cross
    await db.from("product_variants").update({ stock_on_hand: 2 }).eq("id", VARIANT_M);

    const sendToAdmins = vi.fn().mockResolvedValue(undefined);
    const push: PushPort = { sendToAdmins };

    await placeOrder(
      {
        customerName: "Already Low",
        phone: "+54900000001",
        email: "alreadylow@example.com",
        shippingMethod: "pickup",
        paymentMethod: "payway",
        installments: 1,
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 1 }],
      },
      { db, ...depsBase, push },
    );

    expect(sendToAdmins.mock.calls.some((c) => c[0]?.event === "stock.low")).toBe(false);
    expect(sendToAdmins.mock.calls.some((c) => c[0]?.event === "order.created")).toBe(true);
  });
});

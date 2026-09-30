import { beforeAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { consoleEmail } from "@/server/email/console";
import { placeOrder } from "./place-order";

const VARIANT_M = "33333333-3333-4333-a333-333333333001";

describe("placeOrder", () => {
  beforeAll(async () => {
    const db = createServiceClient();
    await db.from("stock_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db
      .from("product_variants")
      .update({ stock_on_hand: 5 })
      .eq("id", VARIANT_M);
  });

  it("reserves stock and rejects oversell", async () => {
    const db = createServiceClient();

    const order = await placeOrder(
      {
        customerName: "Test Buyer",
        phone: "+54911111111",
        email: "buyer@example.com",
        shippingMethod: "pickup",
        paymentMethod: "transfer",
        shippingAddress: null,
        lines: [{ variantId: VARIANT_M, qty: 5 }],
      },
      { db, email: consoleEmail },
    );

    expect(order.code).toMatch(/^ACT-\d{6}$/);
    expect(order.status).toBe("pendiente_pago");
    expect(order.total_cents).toBeGreaterThan(0);

    await expect(
      placeOrder(
        {
          customerName: "Other",
          phone: "+54922222222",
          email: "other@example.com",
          shippingMethod: "pickup",
          paymentMethod: "cash",
          shippingAddress: null,
          lines: [{ variantId: VARIANT_M, qty: 1 }],
        },
        { db, email: consoleEmail },
      ),
    ).rejects.toMatchObject({
      code: "STOCK_INSUFFICIENT",
      name: "DomainError",
    } satisfies Partial<DomainError>);
  });
});

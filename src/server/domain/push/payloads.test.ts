import { describe, expect, it } from "vitest";
import {
  orderCreatedPayload,
  paymentConfirmedPayload,
  stockLowPayload,
} from "./payloads";

describe("push payloads", () => {
  it("orderCreatedPayload", () => {
    const p = orderCreatedPayload({
      orderId: "oid-1",
      code: "ACT-ABCDEFGHIJ",
      totalCents: 150050,
    });
    expect(p.event).toBe("order.created");
    expect(p.title).toContain("pedido");
    expect(p.body).toContain("ACT-ABCDEFGHIJ");
    expect(p.url).toBe("/admin/pedidos/oid-1");
    expect(p.tag).toBe("order-oid-1-created");
  });

  it("paymentConfirmedPayload", () => {
    const p = paymentConfirmedPayload({ orderId: "oid-1", code: "ACT-X" });
    expect(p.event).toBe("order.payment_confirmed");
    expect(p.url).toBe("/admin/pedidos/oid-1");
    expect(p.tag).toBe("order-oid-1-paid");
  });

  it("stockLowPayload", () => {
    const p = stockLowPayload({
      productId: "pid",
      variantId: "vid",
      productName: "Top Run",
      color: "Negro",
      size: "M",
      available: 2,
    });
    expect(p.event).toBe("stock.low");
    expect(p.url).toBe("/admin/catalogo/pid");
    expect(p.tag).toBe("stock-vid");
    expect(p.body).toMatch(/Top Run/);
    expect(p.body).toMatch(/2/);
  });
});

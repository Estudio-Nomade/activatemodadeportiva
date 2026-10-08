import { describe, expect, it, vi } from "vitest";
import { createPaywayHttpAdapter } from "./http-adapter";
import type { PaywayConfig } from "./config";

const config: PaywayConfig = {
  publicKey: "pub",
  privateKey: "priv",
  siteId: "00097002",
  templateId: 1,
  env: "developer",
  apiBaseUrl: "https://developers.decidir.com/api/v2",
  checkoutBaseUrl: "https://developers.decidir.com/api/v1/checkout-payment-button",
  installmentsFallback: [1],
  grouper: "Test",
  developer: "Dev",
};

describe("createPaywayHttpAdapter", () => {
  it("posts checkout link without products (description only)", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            payment_link: "https://developers.decidir.com/web/checkout/ABC123",
          }),
          { status: 201 },
        ),
    );

    const port = createPaywayHttpAdapter(config, { fetch: fetchMock as unknown as typeof fetch });
    const result = await port.createCheckoutLink({
      siteTransactionId: "ord-1",
      amountCents: 150000,
      currency: "ARS",
      installments: 1,
      description: "Order ACT-TEST",
      customerEmail: "a@b.com",
      successUrl: "http://localhost/pedido?token=t",
      cancelUrl: "http://localhost/pedido?token=t",
      notificationsUrl: "http://localhost/api/payway/notifications",
      products: [{ id: "sku", quantity: 1, valueCents: 150000, description: "Item" }],
    });

    expect(result.paymentLink).toBe("https://developers.decidir.com/web/checkout/ABC123");
    expect(result.paywayPaymentId).toBe("ABC123");
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe("https://developers.decidir.com/api/v1/checkout-payment-button/link");
    expect(call[1].headers).toMatchObject({ apikey: "priv" });
    const body = JSON.parse(String(call[1].body));
    expect(body.site).toBe("00097002");
    expect(body.template_id).toBe(1);
    expect(body.total_price).toBe(1500);
    expect(body.site_transaction_id).toBe("ord-1");
    expect(body.installments).toEqual([1]);
    expect(body.plan_gobierno).toBe(false);
    expect(body.payment_description).toBe("Order ACT-TEST");
    expect(body.products).toBeUndefined();
  });

  it("getPayment maps pesos amount to cents", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "approved",
            amount: 1500.5,
            site_transaction_id: "ord-1",
          }),
          { status: 200 },
        ),
    );
    const port = createPaywayHttpAdapter(config, { fetch: fetchMock as unknown as typeof fetch });
    const info = await port.getPayment("99");
    expect(info).toEqual({
      status: "approved",
      amountCents: 150050,
      siteTransactionId: "ord-1",
    });
  });
});

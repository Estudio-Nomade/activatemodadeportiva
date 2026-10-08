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
  installmentsFallback: [1],
};

describe("createPaywayHttpAdapter", () => {
  it("posts checkout link payload and returns payment_link", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ payment_link: "https://pay.example/link", id: "99" }), {
        status: 201,
      }),
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

    expect(result.paymentLink).toBe("https://pay.example/link");
    expect(result.paywayPaymentId).toBe("99");
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe("https://developers.decidir.com/api/v2/payments/link");
    expect(call[1].headers).toMatchObject({ apikey: "priv" });
    const body = JSON.parse(String(call[1].body));
    expect(body.site).toBe("00097002");
    expect(body.total_price).toBe(150000);
    expect(body.site_transaction_id).toBe("ord-1");
    expect(body.installments).toEqual([1]);
  });

  it("getPayment maps amount and status", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "approved",
          amount: 150000,
          site_transaction_id: "ord-1",
        }),
        { status: 200 },
      ),
    );
    const port = createPaywayHttpAdapter(config, { fetch: fetchMock as unknown as typeof fetch });
    const info = await port.getPayment("99");
    expect(info).toEqual({
      status: "approved",
      amountCents: 150000,
      siteTransactionId: "ord-1",
    });
  });
});

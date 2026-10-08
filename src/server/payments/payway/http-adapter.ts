import { DomainError } from "@/server/domain/errors";
import { centsToPaywayAmount, paywayAmountToCents } from "./amount";
import type { PaywayConfig } from "./config";
import type {
  CreateCheckoutLinkInput,
  CreateCheckoutLinkResult,
  PaywayPaymentInfo,
  PaywayPort,
} from "./port";

type FetchFn = typeof fetch;

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function createPaywayHttpAdapter(
  config: PaywayConfig,
  deps?: { fetch?: FetchFn },
): PaywayPort {
  const fetchImpl = deps?.fetch ?? fetch;

  async function request(
    method: string,
    path: string,
    body?: unknown,
    apiKey: string = config.privateKey,
  ): Promise<{ status: number; json: unknown }> {
    const res = await fetchImpl(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    return { status: res.status, json };
  }

  return {
    async createCheckoutLink(input: CreateCheckoutLinkInput): Promise<CreateCheckoutLinkResult> {
      const total = centsToPaywayAmount(input.amountCents);
      const payload = {
        site: config.siteId,
        template_id: config.templateId,
        total_price: total,
        currency: input.currency,
        payment_method_id: 1,
        installments: [input.installments],
        payment_description: input.description,
        public_apikey: config.publicKey,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        redirect_url: input.successUrl,
        notifications_url: input.notificationsUrl,
        site_transaction_id: input.siteTransactionId,
        customer_email: input.customerEmail,
        products: input.products.map((p) => ({
          id: p.id,
          quantity: p.quantity,
          value: centsToPaywayAmount(p.valueCents),
          description: p.description,
        })),
      };

      const { status, json } = await request("POST", "/payments/link", payload);
      if (status < 200 || status >= 300) {
        throw new DomainError(
          "PAYWAY_LINK_FAILED",
          `Payway link failed (${status}): ${JSON.stringify(json)}`,
        );
      }

      const row = asRecord(json);
      const paymentLink = stringField(
        row.payment_link ?? row.paymentLink ?? row.link ?? row.url,
      );
      if (!paymentLink) {
        throw new DomainError("PAYWAY_LINK_FAILED", "Payway response missing payment_link");
      }

      const paywayPaymentId = stringField(row.id ?? row.payment_id ?? row.paymentId) ?? undefined;
      return { paymentLink, paywayPaymentId };
    },

    async getPayment(paywayPaymentId: string): Promise<PaywayPaymentInfo> {
      const { status, json } = await request("GET", `/payments/${encodeURIComponent(paywayPaymentId)}`);
      if (status < 200 || status >= 300) {
        throw new DomainError(
          "PAYWAY_NOTIFICATION_INVALID",
          `Payway getPayment failed (${status})`,
        );
      }
      const row = asRecord(json);
      const amountRaw = row.amount;
      if (typeof amountRaw !== "number") {
        throw new DomainError("PAYWAY_NOTIFICATION_INVALID", "Payway payment missing amount");
      }
      const siteTransactionId = stringField(row.site_transaction_id ?? row.siteTransactionId);
      if (!siteTransactionId) {
        throw new DomainError(
          "PAYWAY_NOTIFICATION_INVALID",
          "Payway payment missing site_transaction_id",
        );
      }
      const paymentStatus = stringField(row.status) ?? "";
      return {
        status: paymentStatus,
        amountCents: paywayAmountToCents(amountRaw),
        siteTransactionId,
      };
    },
  };
}

function stringField(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

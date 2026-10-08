import { DomainError } from "@/server/domain/errors";
import { centsToPaywayAmount, paywayAmountToCents } from "./amount";
import { paywayXSourceHeader, type PaywayConfig } from "./config";
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

function stringField(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Payway returns payment_link only; id is the last path segment. */
function paymentIdFromLink(link: string): string | undefined {
  try {
    const path = new URL(link).pathname.replace(/\/+$/, "");
    const seg = path.split("/").filter(Boolean).pop();
    return seg || undefined;
  } catch {
    return undefined;
  }
}

export function createPaywayHttpAdapter(
  config: PaywayConfig,
  deps?: { fetch?: FetchFn },
): PaywayPort {
  const fetchImpl = deps?.fetch ?? fetch;
  const xSource = paywayXSourceHeader(config.grouper, config.developer);

  async function request(
    method: string,
    url: string,
    body?: unknown,
    apiKey: string = config.privateKey,
  ): Promise<{ status: number; json: unknown }> {
    const res = await fetchImpl(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        "X-Source": xSource,
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
      // Payway rejects products + payment_description together; use description only.
      const payload: Record<string, unknown> = {
        site: config.siteId,
        template_id: config.templateId,
        total_price: total,
        currency: input.currency,
        installments: [input.installments],
        payment_description: input.description,
        public_apikey: config.publicKey,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        notifications_url: input.notificationsUrl,
        origin_platform: "SDK-Node",
        plan_gobierno: false,
        site_transaction_id: input.siteTransactionId,
      };

      const { status, json } = await request(
        "POST",
        `${config.checkoutBaseUrl}/link`,
        payload,
      );
      if (status < 200 || status >= 300) {
        throw new DomainError(
          "PAYWAY_LINK_FAILED",
          `Payway link failed (${status}): ${JSON.stringify(json)}`,
        );
      }

      const row = asRecord(json);
      const nested = asRecord(row.data);
      let paymentLink = stringField(
        row.payment_link ?? row.paymentLink ?? row.link ?? row.url ?? nested.payment_link,
      );
      let paymentId =
        stringField(row.id ?? row.payment_id ?? row.paymentId ?? nested.id) ?? undefined;

      if (!paymentLink && paymentId) {
        const host =
          config.env === "production"
            ? "https://live.decidir.com"
            : "https://developers.decidir.com";
        paymentLink = `${host}/web/checkout/${paymentId}`;
      }
      if (!paymentLink) {
        throw new DomainError(
          "PAYWAY_LINK_FAILED",
          `Payway response missing payment_link/id: ${JSON.stringify(json)}`,
        );
      }
      if (!paymentId) {
        paymentId = paymentIdFromLink(paymentLink);
      }

      return { paymentLink, paywayPaymentId: paymentId };
    },

    async getPayment(paywayPaymentId: string): Promise<PaywayPaymentInfo> {
      const { status, json } = await request(
        "GET",
        `${config.apiBaseUrl}/payments/${encodeURIComponent(paywayPaymentId)}`,
      );
      if (status < 200 || status >= 300) {
        throw new DomainError(
          "PAYWAY_NOTIFICATION_INVALID",
          `Payway getPayment failed (${status}): ${JSON.stringify(json)}`,
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

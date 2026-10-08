import { DomainError } from "@/server/domain/errors";
import { parseInstallmentsAllowList } from "@/server/domain/checkout/installments";

export type PaywayConfig = {
  publicKey: string;
  privateKey: string;
  siteId: string;
  templateId: number;
  env: "developer" | "production";
  /** REST API v2 (payments, health) */
  apiBaseUrl: string;
  /** Checkout payment-button base (…/checkout-payment-button) — POST /link */
  checkoutBaseUrl: string;
  installmentsFallback: number[];
  grouper: string;
  developer: string;
};

export function loadPaywayConfig(env: NodeJS.ProcessEnv = process.env): PaywayConfig {
  const publicKey = env.PAYWAY_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.PAYWAY_PRIVATE_KEY?.trim() ?? "";
  const siteId = env.PAYWAY_SITE_ID?.trim() ?? "";
  const templateId = Number(env.PAYWAY_TEMPLATE_ID ?? "1");
  const ambient = (env.PAYWAY_ENV ?? "developer").trim();

  if (!publicKey || !privateKey || !siteId) {
    throw new DomainError("PAYWAY_CONFIG_MISSING", "Payway env keys are not configured");
  }
  if (ambient !== "developer" && ambient !== "production") {
    throw new DomainError("PAYWAY_CONFIG_MISSING", "PAYWAY_ENV must be developer|production");
  }

  const apiBaseUrl =
    ambient === "production"
      ? "https://ventasonline.payway.com.ar/api/v2"
      : "https://developers.decidir.com/api/v2";

  const checkoutBaseUrl =
    ambient === "production"
      ? "https://ventasonline.payway.com.ar/api/v1/checkout-payment-button"
      : "https://developers.decidir.com/api/v1/checkout-payment-button";

  return {
    publicKey,
    privateKey,
    siteId,
    templateId: Number.isInteger(templateId) && templateId > 0 ? templateId : 1,
    env: ambient,
    apiBaseUrl,
    checkoutBaseUrl,
    installmentsFallback: parseInstallmentsAllowList(env.PAYWAY_INSTALLMENTS ?? "1"),
    grouper: env.PAYWAY_GROUPER?.trim() || "ActivateModaDeportiva",
    developer: env.PAYWAY_DEVELOPER?.trim() || "Activate",
  };
}

export function paywayXSourceHeader(grouper: string, developer: string): string {
  const payload = JSON.stringify({
    service: "SDK-NODE",
    grouper,
    developer,
  });
  return Buffer.from(payload, "utf8").toString("base64");
}

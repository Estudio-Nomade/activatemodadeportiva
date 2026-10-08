import { DomainError } from "@/server/domain/errors";
import { parseInstallmentsAllowList } from "@/server/domain/checkout/installments";

export type PaywayConfig = {
  publicKey: string;
  privateKey: string;
  siteId: string;
  templateId: number;
  env: "developer" | "production";
  apiBaseUrl: string;
  installmentsFallback: number[];
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

  return {
    publicKey,
    privateKey,
    siteId,
    templateId: Number.isInteger(templateId) && templateId > 0 ? templateId : 1,
    env: ambient,
    apiBaseUrl,
    installmentsFallback: parseInstallmentsAllowList(env.PAYWAY_INSTALLMENTS ?? "1"),
  };
}

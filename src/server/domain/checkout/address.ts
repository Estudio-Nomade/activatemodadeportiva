import { DomainError } from "@/server/domain/errors";
import type { ShippingMethod } from "@/server/domain/pricing/calculate-totals";

const REQUIRED_ANDREANI_KEYS = ["line1", "city", "postalCode"] as const;

export function assertShippingAddress(
  shippingMethod: ShippingMethod,
  shippingAddress: Record<string, unknown> | null | undefined,
): void {
  if (shippingMethod !== "andreani") return;

  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Shipping address is required for Andreani",
    );
  }

  for (const key of REQUIRED_ANDREANI_KEYS) {
    const value = shippingAddress[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `Shipping address field "${key}" is required for Andreani`,
      );
    }
  }
}

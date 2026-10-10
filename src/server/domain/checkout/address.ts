import { DomainError } from "@/server/domain/errors";
import type { ShippingMethod } from "@/server/domain/pricing/calculate-totals";

const REQUIRED_BASE_KEYS = ["line1", "city", "postalCode"] as const;
const REQUIRED_BRANCH_KEYS = ["branchName", ...REQUIRED_BASE_KEYS] as const;

function assertRequiredStringFields(
  shippingAddress: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  for (const key of keys) {
    const value = shippingAddress[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `Shipping address field "${key}" is required for ${label}`,
      );
    }
  }
}

export function assertShippingAddress(
  shippingMethod: ShippingMethod,
  shippingAddress: Record<string, unknown> | null | undefined,
): void {
  if (shippingMethod === "pickup") return;

  if (shippingMethod !== "andreani" && shippingMethod !== "andreani_sucursal") {
    return;
  }

  const label =
    shippingMethod === "andreani_sucursal" ? "Andreani sucursal" : "Andreani";

  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Shipping address is required for ${label}`,
    );
  }

  if (shippingMethod === "andreani_sucursal") {
    assertRequiredStringFields(shippingAddress, REQUIRED_BRANCH_KEYS, label);
    return;
  }

  assertRequiredStringFields(shippingAddress, REQUIRED_BASE_KEYS, label);
}

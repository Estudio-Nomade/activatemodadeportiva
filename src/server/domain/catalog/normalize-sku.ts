import { TRPCError } from "@trpc/server";

export const SKU_MAX_LEN = 64;

export function normalizeSku(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.length > SKU_MAX_LEN) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Código de stock máximo ${SKU_MAX_LEN} caracteres`,
    });
  }
  return s;
}

export function isUniqueViolation(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  return error?.code === "23505" || (error?.message?.toLowerCase().includes("unique") ?? false);
}

export function skuConflictMessage(
  error: { message?: string } | null | undefined,
): string | null {
  const msg = error?.message?.toLowerCase() ?? "";
  if (msg.includes("product_variants_sku_unique") || msg.includes("(lower(trim(sku)))")) {
    return "Ese código de stock ya está usado en otra variante";
  }
  return null;
}

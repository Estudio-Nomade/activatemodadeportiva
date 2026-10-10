import { DomainError } from "../errors";

/** Fixed cuota options exposed in admin config (must match merchant Payway capability). */
export const PAYWAY_INSTALLMENT_OPTIONS = [1, 3, 6] as const;

export function parseInstallmentsAllowList(
  raw: string | number[] | null | undefined,
): number[] {
  if (Array.isArray(raw)) {
    const nums = raw.map(Number).filter((n) => Number.isInteger(n) && n >= 1);
    return nums.length ? [...new Set(nums)].sort((a, b) => a - b) : [1];
  }
  if (typeof raw === "string" && raw.trim()) {
    const nums = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1);
    return nums.length ? [...new Set(nums)].sort((a, b) => a - b) : [1];
  }
  return [1];
}

/** Normalize admin write: fixed catalog only, sorted unique, empty → [1]. */
export function normalizeAdminInstallments(raw: number[] | null | undefined): number[] {
  const allowed = new Set<number>(PAYWAY_INSTALLMENT_OPTIONS);
  const parsed = parseInstallmentsAllowList(raw).filter((n) => allowed.has(n));
  return parsed.length ? parsed : [1];
}

export function assertInstallmentsAllowed(
  installments: number,
  allowList: number[],
): void {
  if (!Number.isInteger(installments) || installments < 1) {
    throw new DomainError("INSTALLMENTS_NOT_ALLOWED", "Invalid installments");
  }
  if (!allowList.includes(installments)) {
    throw new DomainError(
      "INSTALLMENTS_NOT_ALLOWED",
      `Installments ${installments} not allowed`,
    );
  }
}

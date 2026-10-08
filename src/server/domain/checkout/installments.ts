import { DomainError } from "../errors";

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

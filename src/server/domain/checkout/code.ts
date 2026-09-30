import { randomBytes } from "node:crypto";

export function generateOrderCode(): string {
  const n = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return `ACT-${String(n).padStart(6, "0")}`;
}

export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

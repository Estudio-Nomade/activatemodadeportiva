import { randomBytes } from "node:crypto";

/** Human-facing code with enough entropy to resist casual enumeration. */
export function generateOrderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let body = "";
  for (let i = 0; i < 10; i++) {
    body += alphabet[bytes[i]! % alphabet.length];
  }
  return `ACT-${body}`;
}

export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

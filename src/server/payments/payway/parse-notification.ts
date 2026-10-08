export type ParsedPaywayNotification = {
  siteTransactionId: string | null;
  paywayPaymentId: string | null;
  status: string | null;
  amountRaw: number | null;
};

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

export function parsePaywayNotification(body: unknown): ParsedPaywayNotification {
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested =
    o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : o;

  return {
    siteTransactionId: stringOrNull(
      nested.site_transaction_id ?? nested.siteTransactionId ?? o.site_transaction_id,
    ),
    paywayPaymentId: stringOrNull(
      nested.id ?? nested.payment_id ?? nested.paymentId ?? o.id,
    ),
    status: stringOrNull(nested.status ?? o.status),
    amountRaw: numberOrNull(nested.amount ?? o.amount),
  };
}

import type { ServiceClient } from "@/server/db/supabase";

/** Columns always present (pre-Payway cloud DBs). */
export const ORDER_SELECT_CORE = `
  id, code, access_token, status, customer_name, phone, email,
  shipping_method, payment_method, subtotal_cents, discount_cents,
  shipping_cents, total_cents, shipping_address, reservation_expires_at,
  cancel_reason, created_at, updated_at, cancelled_at,
  order_items(id, product_name, color, size, unit_price_cents, qty, variant_id, sku),
  payment_proofs(id, storage_path, uploaded_at)
` as const;

/** Full select when Payway migration is applied. */
export const ORDER_SELECT_FULL = `
  id, code, access_token, status, customer_name, phone, email,
  shipping_method, payment_method, subtotal_cents, discount_cents,
  shipping_cents, total_cents, shipping_address, reservation_expires_at,
  cancel_reason, created_at, updated_at, cancelled_at,
  installments, payway_payment_id, payway_site_transaction_id,
  order_items(id, product_name, color, size, unit_price_cents, qty, variant_id, sku),
  payment_proofs(id, storage_path, uploaded_at)
` as const;

export const ADMIN_ORDER_SELECT_CORE = `
  id, code, access_token, status, customer_name, phone, email,
  shipping_method, payment_method, subtotal_cents, discount_cents,
  shipping_cents, total_cents, shipping_address, reservation_expires_at,
  cancel_reason, created_at, updated_at, cancelled_at,
  order_items(id, product_name, color, size, unit_price_cents, qty, variant_id, sku),
  payment_proofs(id, storage_path, uploaded_at),
  stock_reservations(id, variant_id, qty, status, expires_at)
` as const;

export const ADMIN_ORDER_SELECT_FULL = `
  id, code, access_token, status, customer_name, phone, email,
  shipping_method, payment_method, subtotal_cents, discount_cents,
  shipping_cents, total_cents, shipping_address, reservation_expires_at,
  cancel_reason, created_at, updated_at, cancelled_at,
  installments, payway_payment_id, payway_site_transaction_id,
  order_items(id, product_name, color, size, unit_price_cents, qty, variant_id, sku),
  payment_proofs(id, storage_path, uploaded_at),
  stock_reservations(id, variant_id, qty, status, expires_at)
` as const;

export const PAYWAY_LINK_ORDER_SELECT_CORE =
  "id, code, email, status, payment_method, total_cents, access_token, reservation_expires_at" as const;

export const PAYWAY_LINK_ORDER_SELECT_FULL =
  "id, code, email, status, payment_method, total_cents, access_token, reservation_expires_at, payway_site_transaction_id, payway_link_attempt, installments" as const;

/** True when PostgREST/SQL says a selected column is missing on orders. */
export function isMissingOrdersPaywayColumn(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  if (!m.includes("does not exist") && !m.includes("could not find")) return false;
  return (
    m.includes("installments") ||
    m.includes("payway_payment_id") ||
    m.includes("payway_site_transaction_id") ||
    m.includes("payway_link_attempt")
  );
}

type OrderRow = Record<string, unknown>;

/** Shape used by admin order detail + public tracking (relations included). */
export type OrderDetailRow = {
  id: string;
  code: string;
  access_token: string;
  status: string;
  customer_name: string;
  phone: string;
  email: string;
  shipping_method: string;
  payment_method: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address: unknown;
  reservation_expires_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  installments: number;
  payway_payment_id: string | null;
  payway_site_transaction_id: string | null;
  payway_link_attempt?: number;
  order_items: Array<{
    id: string;
    product_name: string;
    color: string;
    size: string;
    unit_price_cents: number;
    qty: number;
    variant_id: string | null;
    sku: string | null;
  }> | null;
  payment_proofs: Array<{
    id: string;
    storage_path: string;
    uploaded_at: string;
  }> | null;
  stock_reservations?: Array<{
    id: string;
    variant_id: string;
    qty: number;
    status: string;
    expires_at: string;
  }> | null;
};

function withPaywayDefaults(row: OrderRow): OrderDetailRow {
  return {
    ...(row as unknown as OrderDetailRow),
    installments: typeof row.installments === "number" ? row.installments : 1,
    payway_payment_id: (row.payway_payment_id as string | null | undefined) ?? null,
    payway_site_transaction_id:
      (row.payway_site_transaction_id as string | null | undefined) ?? null,
    payway_link_attempt:
      typeof row.payway_link_attempt === "number" ? row.payway_link_attempt : 0,
  };
}

/**
 * Select one order by code and/or access_token.
 * Falls back when cloud lacks Payway columns on `orders`.
 */
export async function selectOrderByCodeOrToken(
  db: ServiceClient,
  input: { code?: string; token?: string },
  mode: "public" | "admin" = "public",
): Promise<{ data: OrderDetailRow | null; error: { message: string } | null }> {
  const full = mode === "admin" ? ADMIN_ORDER_SELECT_FULL : ORDER_SELECT_FULL;
  const core = mode === "admin" ? ADMIN_ORDER_SELECT_CORE : ORDER_SELECT_CORE;

  const run = async (columns: string) => {
    let q = db.from("orders").select(columns);
    if (input.code) q = q.eq("code", input.code);
    if (input.token) q = q.eq("access_token", input.token);
    return q.maybeSingle();
  };

  let { data, error } = await run(full);
  if (error && isMissingOrdersPaywayColumn(error.message)) {
    ({ data, error } = await run(core));
  }

  if (error) return { data: null, error: { message: error.message } };
  if (!data) return { data: null, error: null };
  return { data: withPaywayDefaults(data as unknown as OrderRow), error: null };
}

export async function selectOrderByIdAdmin(
  db: ServiceClient,
  id: string,
): Promise<{ data: OrderDetailRow | null; error: { message: string } | null }> {
  const run = async (columns: string) =>
    db.from("orders").select(columns).eq("id", id).maybeSingle();

  let { data, error } = await run(ADMIN_ORDER_SELECT_FULL);
  if (error && isMissingOrdersPaywayColumn(error.message)) {
    ({ data, error } = await run(ADMIN_ORDER_SELECT_CORE));
  }

  if (error) return { data: null, error: { message: error.message } };
  if (!data) return { data: null, error: null };
  return { data: withPaywayDefaults(data as unknown as OrderRow), error: null };
}

export async function selectOrderForPaywayLink(
  db: ServiceClient,
  token: string,
): Promise<{ data: OrderDetailRow | null; error: { message: string } | null }> {
  const run = async (columns: string) =>
    db.from("orders").select(columns).eq("access_token", token).maybeSingle();

  let { data, error } = await run(PAYWAY_LINK_ORDER_SELECT_FULL);
  if (error && isMissingOrdersPaywayColumn(error.message)) {
    ({ data, error } = await run(PAYWAY_LINK_ORDER_SELECT_CORE));
  }

  if (error) return { data: null, error: { message: error.message } };
  if (!data) return { data: null, error: null };
  return { data: withPaywayDefaults(data as unknown as OrderRow), error: null };
}

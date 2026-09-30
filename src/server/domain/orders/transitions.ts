import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import type { EmailPort } from "@/server/email/port";
import { assertTransition, type OrderStatus } from "./status";

export type TransitionDeps = {
  db: ServiceClient;
  email: EmailPort;
};

type OrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  email: string;
  shipping_method: "pickup" | "andreani";
  access_token: string;
};

async function loadOrder(db: ServiceClient, orderId: string): Promise<OrderRow> {
  const { data, error } = await db
    .from("orders")
    .select("id, code, status, email, shipping_method, access_token")
    .eq("id", orderId)
    .single();

  if (error || !data) {
    throw new DomainError("ORDER_NOT_FOUND", `Order ${orderId} not found`);
  }

  return data as OrderRow;
}

async function setStatus(
  db: ServiceClient,
  orderId: string,
  status: OrderStatus,
  extra?: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", orderId);

  if (error) {
    throw new DomainError("CONFLICT", error.message);
  }
}

async function sendBestEffort(
  email: EmailPort,
  template: Parameters<EmailPort["send"]>[0]["template"],
  order: OrderRow,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    await email.send({
      template,
      to: order.email,
      data: {
        orderId: order.id,
        code: order.code,
        accessToken: order.access_token,
        ...data,
      },
    });
  } catch {
    // best-effort
  }
}

export async function confirmPayment(
  orderId: string,
  deps: TransitionDeps,
): Promise<void> {
  const order = await loadOrder(deps.db, orderId);
  assertTransition(order.status, "pago_confirmado");

  const { data: reservations, error: resError } = await deps.db
    .from("stock_reservations")
    .select("id, variant_id, qty, status")
    .eq("order_id", orderId);

  if (resError) {
    throw new DomainError("CONFLICT", resError.message);
  }

  for (const reservation of reservations ?? []) {
    if (reservation.status !== "active") continue;

    const { data: variant, error: variantError } = await deps.db
      .from("product_variants")
      .select("id, stock_on_hand")
      .eq("id", reservation.variant_id)
      .single();

    if (variantError || !variant) {
      throw new DomainError("CONFLICT", `Variant ${reservation.variant_id} missing`);
    }

    const nextOnHand = variant.stock_on_hand - reservation.qty;
    if (nextOnHand < 0) {
      throw new DomainError("STOCK_INSUFFICIENT", `Variant ${reservation.variant_id}`);
    }

    const { error: stockError } = await deps.db
      .from("product_variants")
      .update({ stock_on_hand: nextOnHand })
      .eq("id", reservation.variant_id);

    if (stockError) {
      throw new DomainError("CONFLICT", stockError.message);
    }

    const { error: updateResError } = await deps.db
      .from("stock_reservations")
      .update({ status: "consumed" })
      .eq("id", reservation.id)
      .eq("status", "active");

    if (updateResError) {
      throw new DomainError("CONFLICT", updateResError.message);
    }
  }

  await setStatus(deps.db, orderId, "pago_confirmado");
  await sendBestEffort(deps.email, "payment_confirmed", order);
}

export async function startPreparing(
  orderId: string,
  deps: TransitionDeps,
): Promise<void> {
  const order = await loadOrder(deps.db, orderId);
  assertTransition(order.status, "preparando");
  await setStatus(deps.db, orderId, "preparando");
}

export async function markReadyForPickup(
  orderId: string,
  deps: TransitionDeps,
): Promise<void> {
  const order = await loadOrder(deps.db, orderId);
  assertTransition(order.status, "listo_retiro", {
    shippingMethod: order.shipping_method,
  });
  await setStatus(deps.db, orderId, "listo_retiro");
  await sendBestEffort(deps.email, "ready_pickup", order);
}

export async function markShipped(
  orderId: string,
  deps: TransitionDeps,
): Promise<void> {
  const order = await loadOrder(deps.db, orderId);
  assertTransition(order.status, "enviado", {
    shippingMethod: order.shipping_method,
  });
  await setStatus(deps.db, orderId, "enviado");
  await sendBestEffort(deps.email, "shipped", order);
}

export async function markDelivered(
  orderId: string,
  deps: TransitionDeps,
): Promise<void> {
  const order = await loadOrder(deps.db, orderId);
  assertTransition(order.status, "entregado", {
    shippingMethod: order.shipping_method,
  });
  await setStatus(deps.db, orderId, "entregado");
  await sendBestEffort(deps.email, "delivered", order);
}

export type CancelReason = "admin" | "expired";

export async function cancelOrder(
  orderId: string,
  reason: CancelReason,
  deps: TransitionDeps,
): Promise<void> {
  const order = await loadOrder(deps.db, orderId);
  assertTransition(order.status, "cancelado", {
    shippingMethod: order.shipping_method,
  });

  const { data: reservations, error: resError } = await deps.db
    .from("stock_reservations")
    .select("id, variant_id, qty, status")
    .eq("order_id", orderId);

  if (resError) {
    throw new DomainError("CONFLICT", resError.message);
  }

  const hadConsumed = (reservations ?? []).some((r) => r.status === "consumed");

  if (hadConsumed) {
    for (const reservation of reservations ?? []) {
      if (reservation.status !== "consumed") continue;

      const { data: variant, error: variantError } = await deps.db
        .from("product_variants")
        .select("id, stock_on_hand")
        .eq("id", reservation.variant_id)
        .single();

      if (variantError || !variant) {
        throw new DomainError("CONFLICT", `Variant ${reservation.variant_id} missing`);
      }

      const { error: stockError } = await deps.db
        .from("product_variants")
        .update({ stock_on_hand: variant.stock_on_hand + reservation.qty })
        .eq("id", reservation.variant_id);

      if (stockError) {
        throw new DomainError("CONFLICT", stockError.message);
      }

      const { error: updateResError } = await deps.db
        .from("stock_reservations")
        .update({ status: "released" })
        .eq("id", reservation.id)
        .eq("status", "consumed");

      if (updateResError) {
        throw new DomainError("CONFLICT", updateResError.message);
      }
    }
  }

  for (const reservation of reservations ?? []) {
    if (reservation.status !== "active") continue;

    const { error: updateResError } = await deps.db
      .from("stock_reservations")
      .update({ status: "released" })
      .eq("id", reservation.id)
      .eq("status", "active");

    if (updateResError) {
      throw new DomainError("CONFLICT", updateResError.message);
    }
  }

  await setStatus(deps.db, orderId, "cancelado", {
    cancel_reason: reason,
    cancelled_at: new Date().toISOString(),
    reservation_expires_at: null,
  });

  await sendBestEffort(deps.email, "cancelled", order, { reason });
}

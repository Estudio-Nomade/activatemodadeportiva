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

function mapRpcError(error: { message: string; code?: string; details?: string }): never {
  const blob = `${error.message} ${error.details ?? ""} ${error.code ?? ""}`;
  if (blob.includes("STOCK_INSUFFICIENT")) {
    throw new DomainError("STOCK_INSUFFICIENT", "Insufficient stock");
  }
  if (blob.includes("INVALID_TRANSITION")) {
    throw new DomainError("INVALID_TRANSITION", "Invalid order transition");
  }
  if (blob.includes("ORDER_NOT_FOUND")) {
    throw new DomainError("ORDER_NOT_FOUND", "Order not found");
  }
  throw new DomainError("CONFLICT", error.message);
}

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

  const { error } = await deps.db.rpc("confirm_payment_tx", {
    p_order_id: orderId,
  });
  if (error) mapRpcError(error);

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

  const { error } = await deps.db.rpc("cancel_order_tx", {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) mapRpcError(error);

  await sendBestEffort(deps.email, "cancelled", order, { reason });
}

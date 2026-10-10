import { assertAdminDeepLink } from "./admin-url";
import type { AdminPushPayload } from "@/server/push/port";

function formatArsFromCents(cents: number): string {
  const pesos = (cents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  return pesos;
}

export function orderCreatedPayload(input: {
  orderId: string;
  code: string;
  totalCents: number;
  paymentMethod?: string;
}): AdminPushPayload {
  const method = input.paymentMethod ? ` · ${input.paymentMethod}` : "";
  return {
    event: "order.created",
    title: "Nuevo pedido",
    body: `${input.code} · ${formatArsFromCents(input.totalCents)}${method}`,
    url: assertAdminDeepLink(`/admin/pedidos/${input.orderId}`),
    tag: `order-${input.orderId}-created`,
  };
}

export function paymentConfirmedPayload(input: {
  orderId: string;
  code: string;
}): AdminPushPayload {
  return {
    event: "order.payment_confirmed",
    title: "Pago confirmado",
    body: input.code,
    url: assertAdminDeepLink(`/admin/pedidos/${input.orderId}`),
    tag: `order-${input.orderId}-paid`,
  };
}

export function stockLowPayload(input: {
  productId: string;
  variantId: string;
  productName: string;
  color: string;
  size: string;
  available: number;
}): AdminPushPayload {
  const label = [input.productName, input.color, input.size].filter(Boolean).join(" · ");
  return {
    event: "stock.low",
    title: "Stock bajo",
    body: `${label} · quedan ${input.available}`,
    url: assertAdminDeepLink(`/admin/catalogo/${input.productId}`),
    tag: `stock-${input.variantId}`,
  };
}

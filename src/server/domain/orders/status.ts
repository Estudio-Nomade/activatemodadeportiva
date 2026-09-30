import { DomainError } from "../errors";

export type OrderStatus =
  | "pendiente_pago"
  | "pago_confirmado"
  | "preparando"
  | "listo_retiro"
  | "enviado"
  | "entregado"
  | "cancelado";

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx?: { shippingMethod?: "pickup" | "andreani" },
): void {
  const allowed = isAllowed(from, to, ctx);
  if (!allowed) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `Cannot transition from ${from} to ${to}`,
    );
  }
}

function isAllowed(
  from: OrderStatus,
  to: OrderStatus,
  ctx?: { shippingMethod?: "pickup" | "andreani" },
): boolean {
  switch (from) {
    case "pendiente_pago":
      return to === "pago_confirmado" || to === "cancelado";
    case "pago_confirmado":
      return to === "preparando" || to === "cancelado";
    case "preparando":
      if (to === "cancelado") return true;
      if (to === "listo_retiro") return ctx?.shippingMethod === "pickup";
      if (to === "enviado") return ctx?.shippingMethod === "andreani";
      return false;
    case "listo_retiro":
      return to === "entregado" || to === "cancelado";
    case "enviado":
      return to === "entregado" || to === "cancelado";
    case "entregado":
    case "cancelado":
      return false;
    default:
      return false;
  }
}

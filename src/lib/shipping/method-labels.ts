/** Buyer-facing ES labels for shipping_method enum values. */
export const SHIPPING_METHOD_LABEL: Record<string, string> = {
  pickup: "Retiro en local",
  andreani: "Andreani domicilio",
  andreani_sucursal: "Andreani sucursal",
};

export function shippingMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return SHIPPING_METHOD_LABEL[method] ?? method;
}

export type OrderTimelineStatus =
  | "pendiente_pago"
  | "pago_confirmado"
  | "preparando"
  | "listo_retiro"
  | "enviado"
  | "entregado"
  | "cancelado";

export type OrderTimelineShipping = "pickup" | "andreani" | string;

type StepState = "done" | "current" | "upcoming";

type Step = {
  key: string;
  label: string;
  state: StepState;
};

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_confirmado: "Pago confirmado",
  preparando: "Preparando",
  listo_retiro: "Listo para retiro",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

function fulfillmentLabel(shippingMethod: OrderTimelineShipping): string {
  return shippingMethod === "pickup" ? "Listo para retiro" : "Enviado";
}

/** Happy-path steps for buyer tracking (cancelado is terminal, no steps). */
export function buildOrderTimelineSteps(
  status: string,
  shippingMethod: OrderTimelineShipping,
): Step[] {
  if (status === "cancelado") return [];

  const labels = [
    "Pedido recibido",
    "Pago confirmado",
    "Preparando",
    fulfillmentLabel(shippingMethod),
    "Entregado",
  ] as const;

  const indexByStatus: Record<string, number> = {
    pendiente_pago: 0,
    pago_confirmado: 1,
    preparando: 2,
    listo_retiro: 3,
    enviado: 3,
    entregado: 4,
  };

  const current = indexByStatus[status] ?? 0;

  return labels.map((label, i) => {
    let state: StepState = "upcoming";
    if (i < current) state = "done";
    else if (i === current) state = "current";
    return { key: `step-${i}`, label, state };
  });
}

export function OrderTimeline({
  status,
  shippingMethod,
}: {
  status: string;
  shippingMethod: OrderTimelineShipping;
}) {
  if (status === "cancelado") return null;

  const steps = buildOrderTimelineSteps(status, shippingMethod);

  return (
    <ol className="order-timeline m-0 list-none space-y-0 p-0" aria-label="Estado del pedido">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const lineDone = step.state === "done";
        return (
          <li
            key={step.key}
            className="relative flex gap-3 pb-4 last:pb-0"
            data-state={step.state}
          >
            {!isLast ? (
              <span
                aria-hidden
                className={`absolute top-[14px] bottom-0 left-[6px] w-0.5 ${
                  lineDone ? "bg-accent" : "bg-border"
                }`}
              />
            ) : null}
            <span
              aria-hidden
              className={`relative z-[1] mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                step.state === "upcoming"
                  ? "border-border bg-surface-soft"
                  : "border-accent bg-accent"
              } ${step.state === "current" ? "ring-4 ring-accent-soft" : ""}`}
            />
            <span
              className={`text-sm leading-snug ${
                step.state === "upcoming"
                  ? "text-muted"
                  : step.state === "current"
                    ? "font-bold text-text"
                    : "font-medium text-text"
              }`}
            >
              {step.label}
              {step.state === "current" ? (
                <span className="mt-0.5 block text-xs font-semibold text-accent">
                  Estado actual
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

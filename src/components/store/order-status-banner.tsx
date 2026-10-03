import { orderStatusLabel } from "@/components/store/order-timeline";

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

export function OrderStatusBanner({
  status,
  reservationExpiresAt,
  cancelReason,
}: {
  status: string;
  shippingMethod?: string;
  reservationExpiresAt?: string | null;
  cancelReason?: string | null;
}) {
  if (status === "cancelado") {
    return (
      <div
        className="rounded-[12px] border border-danger/30 bg-[#F8EDED] px-4 py-3"
        role="status"
      >
        <p className="text-sm font-bold text-danger">Pedido cancelado</p>
        <p className="mt-1 text-xs text-muted">
          {cancelReason
            ? `Motivo: ${cancelReason.replace(/_/g, " ")}.`
            : "Este pedido ya no está activo. El stock se liberó."}
        </p>
      </div>
    );
  }

  if (status === "pendiente_pago") {
    const until = formatWhen(reservationExpiresAt);
    return (
      <div
        className="rounded-[12px] border border-promo/25 bg-[#FBF0EE] px-4 py-3"
        role="status"
      >
        <p className="text-sm font-bold text-promo">Pendiente de pago</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Reservamos tu stock 24 h. Pagá y subí el comprobante antes de que venza la
          reserva
          {until ? (
            <>
              {" "}
              <span className="font-semibold text-text">({until})</span>
            </>
          ) : null}
          .
        </p>
      </div>
    );
  }

  if (status === "listo_retiro") {
    return (
      <div
        className="rounded-[12px] border border-accent/20 bg-accent-soft px-4 py-3"
        role="status"
      >
        <p className="text-sm font-bold text-accent">Listo para retirar</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Tu pedido está listo en el local (San Manuel). Presentá tu código de pedido al
          retirar.
        </p>
      </div>
    );
  }

  if (status === "enviado") {
    return (
      <div
        className="rounded-[12px] border border-accent/20 bg-accent-soft px-4 py-3"
        role="status"
      >
        <p className="text-sm font-bold text-accent">En camino</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Despachamos tu pedido por Andreani. Te avisamos por email cuando haya novedades.
        </p>
      </div>
    );
  }

  if (status === "entregado") {
    return (
      <div
        className="rounded-[12px] border border-success/25 bg-accent-soft px-4 py-3"
        role="status"
      >
        <p className="text-sm font-bold text-success">Entregado</p>
        <p className="mt-1 text-xs text-muted">¡Gracias por tu compra!</p>
      </div>
    );
  }

  if (status === "pago_confirmado" || status === "preparando") {
    return (
      <div
        className="rounded-[12px] border border-accent/15 bg-accent-soft/60 px-4 py-3"
        role="status"
      >
        <p className="text-sm font-bold text-accent">{orderStatusLabel(status)}</p>
        <p className="mt-1 text-xs text-muted">
          {status === "pago_confirmado"
            ? "Recibimos tu pago. Pronto armamos el pedido."
            : "Estamos preparando tu pedido."}
        </p>
      </div>
    );
  }

  return null;
}

"use client";

import { InfoShell } from "@/components/store/info-page";

export default function MediosPagoPage() {
  return (
    <InfoShell title="Medios de pago">
      <p>
        <strong className="text-text">Tarjeta y medios online:</strong> el pago se procesa de
        forma segura en Payway (formulario hospedado). Elegís las cuotas disponibles en el
        checkout.
      </p>
      <p>
        Al confirmar el pedido te redirigimos a Payway. Cuando el pago se acredita, el pedido pasa
        a “pago confirmado” automáticamente.
      </p>
      <p>
        Si cerrás la ventana de pago sin completar, podés reintentar desde el seguimiento del
        pedido mientras la reserva de stock esté activa (24 h).
      </p>
    </InfoShell>
  );
}

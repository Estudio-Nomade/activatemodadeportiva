"use client";

import {
  InfoShell,
  PaymentDiscountLabel,
  TransferAliasCopy,
} from "@/components/store/info-page";

export default function MediosPagoPage() {
  return (
    <InfoShell title="Medios de pago">
      <p>
        <strong className="text-text">Transferencia:</strong> disponible con retiro o Andreani.{" "}
        <PaymentDiscountLabel /> sobre productos. Podés subir el comprobante al confirmar o después
        desde el seguimiento del pedido.
      </p>
      <TransferAliasCopy />
      <p>
        <strong className="text-text">Efectivo:</strong> solo con retiro en local. Mismo descuento
        sobre productos. Se abona al retirar.
      </p>
      <p>Por ahora no aceptamos tarjetas online. Si necesitás otra forma de pago, escribinos.</p>
    </InfoShell>
  );
}

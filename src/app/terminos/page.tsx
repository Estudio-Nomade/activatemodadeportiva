"use client";

import Link from "next/link";
import { ContactLinks, InfoShell, StoreAddressBlock } from "@/components/store/info-page";

export default function TerminosPage() {
  return (
    <InfoShell title="Términos y condiciones">
      <p>
        Al comprar en Activate Moda Deportiva aceptás que los precios y totales se confirman en el
        checkout del servidor, que el stock puede reservarse 24 h en pedidos pendientes de pago, y
        que el efectivo solo aplica a retiro en local.
      </p>
      <p>
        Envíos Andreani y retiro se rigen por lo indicado en{" "}
        <Link href="/envios" className="font-semibold text-accent">
          Envíos
        </Link>
        . Medios de pago en{" "}
        <Link href="/medios-de-pago" className="font-semibold text-accent">
          Medios de pago
        </Link>
        .
      </p>
      <StoreAddressBlock />
      <p>Para consultas comerciales o reclamos:</p>
      <ContactLinks />
    </InfoShell>
  );
}

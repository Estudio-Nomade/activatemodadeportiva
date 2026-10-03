"use client";

import { ContactLinks, InfoShell, StoreAddressBlock } from "@/components/store/info-page";

export default function CambiosPage() {
  return (
    <InfoShell title="Cambios y devoluciones">
      <p>
        Los cambios se gestionan por WhatsApp o en el local. No hay solicitud online de devolución.
      </p>
      <p>
        Escribinos o acercate con el pedido y el producto en condiciones.
      </p>
      <StoreAddressBlock />
      <ContactLinks />
    </InfoShell>
  );
}

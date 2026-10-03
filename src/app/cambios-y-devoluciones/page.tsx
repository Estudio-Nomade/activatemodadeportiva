"use client";

import { ContactLinks, InfoShell, StoreAddressBlock } from "@/components/store/info-page";

export default function CambiosPage() {
  return (
    <InfoShell title="Cambios y devoluciones">
      <p>
        En v1 la gestión de cambios es offline (local / WhatsApp). No hay solicitud online de
        devolución.
      </p>
      <p>
        Escribinos por WhatsApp o acercate al local con el pedido y el producto en condiciones.
      </p>
      <StoreAddressBlock />
      <ContactLinks />
    </InfoShell>
  );
}

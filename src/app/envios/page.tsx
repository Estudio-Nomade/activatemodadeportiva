"use client";

import { InfoShell, ShippingFeesCopy, StoreAddressBlock } from "@/components/store/info-page";

export default function EnviosPage() {
  return (
    <InfoShell title="Envíos">
      <p>
        <strong className="text-text">Retiro en local (San Manuel):</strong> gratis.
      </p>
      <StoreAddressBlock />
      <ShippingFeesCopy />
      <p>
        No hay envío a domicilio dentro de San Manuel: si estás en la zona, retirás en el local.
      </p>
      <p>
        El costo de envío se confirma en el checkout según tu compra y el medio de pago.
      </p>
    </InfoShell>
  );
}

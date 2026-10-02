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
      <p>El total de envío se calcula en el checkout (servidor); no uses importes de esta página para cobrar.</p>
    </InfoShell>
  );
}

"use client";

import { ContactLinks, InfoShell, usePublicStoreSettings } from "@/components/store/info-page";

export default function PrivacidadPage() {
  const { data } = usePublicStoreSettings();
  const email = data?.contact_email?.trim();

  return (
    <InfoShell title="Privacidad">
      <p>
        Usamos tus datos de contacto y envío solo para procesar el pedido, enviarte actualizaciones
        de estado y coordinar retiro o envío.
      </p>
      <p>
        No vendemos tu información a terceros. El acceso al pedido se hace con código y, cuando
        aplica, un enlace con token enviado por email.
      </p>
      <p>
        Para acceder, corregir o pedir baja de datos, escribinos
        {email ? (
          <>
            {" "}
            a <a href={`mailto:${email}`} className="font-semibold text-accent">{email}</a> o
          </>
        ) : (
          " "
        )}
        por WhatsApp / Instagram:
      </p>
      <ContactLinks />
    </InfoShell>
  );
}

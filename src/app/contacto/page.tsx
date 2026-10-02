"use client";

import {
  InfoShell,
  StoreAddressBlock,
  usePublicStoreSettings,
} from "@/components/store/info-page";
import { instagramHref } from "@/lib/contact/instagram";
import { whatsappHref } from "@/lib/contact/whatsapp";

export default function ContactoPage() {
  const { data, isLoading } = usePublicStoreSettings();
  const waHref = whatsappHref(data?.whatsapp);
  const email = data?.contact_email?.trim();
  const ig = instagramHref(data?.instagram);

  return (
    <InfoShell title="Contacto">
      {isLoading ? <p>Cargando datos de la tienda…</p> : null}
      <StoreAddressBlock />
      {email ? (
        <p>
          Email:{" "}
          <a href={`mailto:${email}`} className="font-semibold text-accent">
            {email}
          </a>
        </p>
      ) : (
        <p>Email de contacto: configurar en admin → Config.</p>
      )}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
        {waHref ? (
          <a href={waHref} target="_blank" rel="noreferrer" className="btn btn-primary max-w-xs">
            WhatsApp
          </a>
        ) : (
          <p className="text-sm">WhatsApp aún no configurado en admin.</p>
        )}
        <a href={ig} target="_blank" rel="noreferrer" className="btn btn-secondary max-w-xs">
          Instagram
        </a>
      </div>
      <p className="text-sm">
        Seguinos:{" "}
        <a href={ig} target="_blank" rel="noreferrer" className="font-semibold text-accent">
          @activate.ropa.deportiva
        </a>
      </p>
    </InfoShell>
  );
}

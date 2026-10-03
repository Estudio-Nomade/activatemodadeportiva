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
  const waHref = whatsappHref(data?.whatsapp, data?.whatsapp_message);
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
      ) : null}
      {waHref ? (
        <a href={waHref} target="_blank" rel="noreferrer" className="btn btn-primary max-w-xs">
          WhatsApp
        </a>
      ) : null}
      <a href={ig} target="_blank" rel="noreferrer" className="font-semibold text-accent">
        Instagram · @activate.ropa.deportiva
      </a>
    </InfoShell>
  );
}

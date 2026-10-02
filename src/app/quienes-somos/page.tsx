"use client";

import Link from "next/link";
import {
  ContactLinks,
  InfoShell,
  StoreAddressBlock,
  usePublicStoreSettings,
} from "@/components/store/info-page";

export default function QuienesSomosPage() {
  const { data } = usePublicStoreSettings();
  const season = data?.season_label?.trim();

  return (
    <InfoShell title="Quiénes somos">
      <p>
        Activate Moda Deportiva es una tienda de indumentaria deportiva con local físico en San
        Manuel. Vendemos online con retiro en el local o envío Andreani a todo el país.
      </p>
      {season ? (
        <p>
          Temporada actual: <strong className="text-text">{season}</strong>.
        </p>
      ) : null}
      <StoreAddressBlock />
      <p>
        Más info en{" "}
        <Link href="/contacto" className="font-semibold text-accent">
          Contacto
        </Link>
        .
      </p>
      <ContactLinks />
    </InfoShell>
  );
}

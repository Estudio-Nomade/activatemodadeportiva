"use client";

import { trpc } from "@/lib/trpc/client";

export default function ContactoPage() {
  const settings = trpc.settings.getPublic.useQuery();
  const wa = settings.data?.whatsapp?.trim();
  const waHref = wa
    ? wa.startsWith("http")
      ? wa
      : `https://wa.me/${wa.replace(/[^\d]/g, "")}`
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-8 text-sm text-muted md:px-6">
      <h1 className="text-2xl font-bold text-text">Contacto</h1>
      <p>San Manuel · horarios y dirección placeholders.</p>
      {waHref ? (
        <a href={waHref} target="_blank" rel="noreferrer" className="btn btn-primary max-w-xs">
          WhatsApp
        </a>
      ) : (
        <p>WhatsApp aún no configurado en admin.</p>
      )}
      {settings.data?.instagram ? (
        <a href={settings.data.instagram} target="_blank" rel="noreferrer" className="block text-accent">
          Instagram
        </a>
      ) : null}
    </div>
  );
}

"use client";

import { instagramHref } from "@/lib/contact/instagram";
import { whatsappHref } from "@/lib/contact/whatsapp";
import { discountPercentFromBps } from "@/lib/format/promo";
import { formatArsCents } from "@/lib/format/money";
import { trpc } from "@/lib/trpc/client";

export function InfoShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 md:px-6 lg:py-12">
      <h1 className="text-2xl font-bold text-text md:text-3xl">{title}</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted md:text-[15px]">{children}</div>
    </article>
  );
}

export function usePublicStoreSettings() {
  return trpc.settings.getPublic.useQuery();
}

export function ContactLinks() {
  const { data } = usePublicStoreSettings();
  const wa = whatsappHref(data?.whatsapp);
  const ig = instagramHref(data?.instagram);
  const email = data?.contact_email?.trim();
  return (
    <div className="flex flex-col gap-2 pt-2">
      {wa ? (
        <a href={wa} target="_blank" rel="noreferrer" className="font-semibold text-accent">
          WhatsApp
        </a>
      ) : null}
      <a href={ig} target="_blank" rel="noreferrer" className="font-semibold text-accent">
        Instagram · @activate.ropa.deportiva
      </a>
      {email ? (
        <a href={`mailto:${email}`} className="font-semibold text-accent">
          {email}
        </a>
      ) : null}
      {!wa && !email ? (
        <p className="text-sm text-muted">
          WhatsApp / email se configuran en admin. Instagram ya está disponible arriba.
        </p>
      ) : null}
    </div>
  );
}

export function StoreAddressBlock() {
  const { data, isLoading } = usePublicStoreSettings();
  if (isLoading) return <p className="text-sm text-muted">Cargando…</p>;
  const address = data?.contact_address?.trim();
  return (
    <p>
      <strong className="text-text">Local:</strong>{" "}
      {address || "San Manuel (dirección en admin → Config)"}
    </p>
  );
}

export function PaymentDiscountLabel() {
  const { data } = usePublicStoreSettings();
  const pct = discountPercentFromBps(data?.payment_discount_bps ?? 1000);
  return <strong className="text-text">{pct}% off</strong>;
}

export function ShippingFeesCopy() {
  const { data } = usePublicStoreSettings();
  const fee = data?.andreani_fee_cents ?? 0;
  const thr = data?.free_shipping_threshold_cents ?? 0;
  return (
    <>
      <p>
        <strong className="text-text">Andreani a domicilio:</strong>{" "}
        {fee > 0 ? (
          <>
            costo de referencia {formatArsCents(fee)}
            {thr > 0 ? (
              <>
                . Si el subtotal de productos (después del descuento por medio de pago) llega a{" "}
                {formatArsCents(thr)}, el envío es gratis
              </>
            ) : null}
            .
          </>
        ) : (
          "costo configurable en la tienda (se calcula al checkout)."
        )}
      </p>
    </>
  );
}

export function TransferAliasCopy() {
  const { data } = usePublicStoreSettings();
  const alias = data?.transfer_cbu_alias_text?.trim();
  return alias ? (
    <p>
      Alias / CBU: <strong className="text-text">{alias}</strong>
    </p>
  ) : (
    <p>El alias/CBU se muestra al confirmar el pedido (configurado en admin).</p>
  );
}

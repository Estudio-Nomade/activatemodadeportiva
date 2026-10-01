"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart/store";
import { formatPromoBarCopy } from "@/lib/format/promo";
import { trpc } from "@/lib/trpc/client";

export function PromoBar() {
  const settings = trpc.settings.getPublic.useQuery();
  const bps = settings.data?.payment_discount_bps ?? 1000;
  return (
    <div className="store-promo bg-bar px-4 py-2.5 text-center text-[11px] font-semibold tracking-[0.06em] text-inverse">
      {formatPromoBarCopy(bps)}
    </div>
  );
}

export function StoreHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const settings = trpc.settings.getPublic.useQuery();
  const [menuOpen, setMenuOpen] = useState(false);
  const cats = trpc.catalog.listCategories.useQuery();

  const roots = (cats.data ?? []).filter((c) => !c.parent_id);
  const childrenOf = (id: string) =>
    (cats.data ?? []).filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <header className="store-header-sticky sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface md:hidden"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>

          <Link href="/" className="flex min-w-0 flex-col items-start md:items-start">
            <span className="flex items-center gap-2">
              <Image
                src="/brand/logo.png"
                alt="Activate"
                width={120}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            </span>
            <span className="text-[10px] text-muted">
              {settings.data?.season_label ?? "Moda deportiva"}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            {roots.map((r) => (
              <Link key={r.id} href={`/c/${r.slug}`} className="hover:text-accent">
                {r.name}
              </Link>
            ))}
            <Link href="/buscar" className="hover:text-accent">
              Buscar
            </Link>
            <Link href="/quienes-somos" className="hover:text-accent">
              Quiénes somos
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/buscar"
              className="grid h-12 w-12 place-items-center rounded-full border border-border md:hidden"
              aria-label="Buscar"
            >
              ⌕
            </Link>
            <Link
              href="/carrito"
              className="relative grid h-12 w-12 place-items-center rounded-full border border-border"
              aria-label="Carrito"
            >
              🛒
              {count > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-inverse">
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="h-full w-[86%] max-w-sm overflow-y-auto bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <strong>Menú</strong>
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-full border border-border"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {roots.map((r) => (
                <div key={r.id} className="border-b border-border pb-3">
                  <Link
                    href={`/c/${r.slug}`}
                    className="block py-2 text-base font-bold"
                    onClick={() => setMenuOpen(false)}
                  >
                    {r.name}
                  </Link>
                  <div className="ml-2 flex flex-col">
                    {childrenOf(r.id).map((ch) => (
                      <Link
                        key={ch.id}
                        href={`/c/${ch.slug}`}
                        className="py-2 text-sm text-muted"
                        onClick={() => setMenuOpen(false)}
                      >
                        {ch.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <Link href="/buscar" onClick={() => setMenuOpen(false)} className="py-2 font-semibold">
                Buscar
              </Link>
              <Link href="/pedido" onClick={() => setMenuOpen(false)} className="py-2 font-semibold">
                Consultar pedido
              </Link>
              <Link href="/quienes-somos" onClick={() => setMenuOpen(false)} className="py-2 font-semibold">
                Quiénes somos
              </Link>
              <Link href="/envios" onClick={() => setMenuOpen(false)} className="py-2 text-sm text-muted">
                Envíos
              </Link>
              <Link href="/medios-de-pago" onClick={() => setMenuOpen(false)} className="py-2 text-sm text-muted">
                Medios de pago
              </Link>
              <Link
                href="/cambios-y-devoluciones"
                onClick={() => setMenuOpen(false)}
                className="py-2 text-sm text-muted"
              >
                Cambios y devoluciones
              </Link>
              {pathname ? null : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function StoreFooter() {
  const settings = trpc.settings.getPublic.useQuery();
  const wa = settings.data?.whatsapp?.trim();
  const ig = settings.data?.instagram?.trim();
  const waHref = wa
    ? wa.startsWith("http")
      ? wa
      : `https://wa.me/${wa.replace(/[^\d]/g, "")}`
    : null;

  return (
    <footer className="mt-auto border-t border-border bg-surface-soft">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="text-sm font-bold tracking-wide">ACTIVATE</p>
          <p className="mt-2 text-sm text-muted">Moda deportiva · San Manuel</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/pedido">Consultar pedido</Link>
          <Link href="/envios">Envíos</Link>
          <Link href="/medios-de-pago">Medios de pago</Link>
          <Link href="/cambios-y-devoluciones">Cambios y devoluciones</Link>
          <Link href="/terminos">Términos y condiciones</Link>
          <Link href="/privacidad">Privacidad</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {waHref ? (
            <a href={waHref} target="_blank" rel="noreferrer" className="font-semibold text-accent">
              WhatsApp
            </a>
          ) : (
            <span className="text-muted">WhatsApp (configurar en admin)</span>
          )}
          {ig ? (
            <a href={ig} target="_blank" rel="noreferrer">
              Instagram
            </a>
          ) : null}
          <Link href="/contacto">Contacto</Link>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab() {
  const settings = trpc.settings.getPublic.useQuery();
  const wa = settings.data?.whatsapp?.trim();
  if (!wa) return null;
  const href = wa.startsWith("http") ? wa : `https://wa.me/${wa.replace(/[^\d]/g, "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="wa-fab fixed z-40 grid h-14 w-14 place-items-center rounded-full bg-wa text-lg font-bold text-white shadow-lg"
      aria-label="WhatsApp"
    >
      WA
    </a>
  );
}

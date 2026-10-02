"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart/store";
import { whatsappHref } from "@/lib/contact/whatsapp";
import { formatPromoBarCopy } from "@/lib/format/promo";
import { trpc } from "@/lib/trpc/client";
import {
  IconCart,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconMenu,
  IconSearch,
  IconWhatsApp,
} from "@/components/store/icons";

export function PromoBar() {
  const settings = trpc.settings.getPublic.useQuery();
  const bps = settings.data?.payment_discount_bps ?? 1000;
  return (
    <div className="store-promo bg-bar px-4 py-2.5 text-center text-[11px] font-semibold tracking-[0.06em] text-inverse">
      {formatPromoBarCopy(bps)}
    </div>
  );
}

type Cat = { id: string; name: string; slug: string; parent_id: string | null; sort_order: number };

export function StoreHeader() {
  const { count } = useCart();
  const settings = trpc.settings.getPublic.useQuery();
  const [menuOpen, setMenuOpen] = useState(false);
  /** null = root list; string = expanded root category id (drill-down) */
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);
  const cats = trpc.catalog.listCategories.useQuery();

  const roots = (cats.data ?? [])
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (id: string) =>
    (cats.data ?? [])
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.sort_order - b.sort_order);

  const expandedRoot: Cat | undefined = expandedRootId
    ? roots.find((r) => r.id === expandedRootId)
    : undefined;
  const expandedChildren = expandedRoot ? childrenOf(expandedRoot.id) : [];

  const wa = whatsappHref(settings.data?.whatsapp);
  const season = settings.data?.season_label?.trim() || "Moda deportiva";

  function openMenu() {
    setExpandedRootId(null);
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    setExpandedRootId(null);
  }

  return (
    <>
      <header className="store-header-sticky sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface text-text md:hidden"
            aria-label="Abrir menú"
            onClick={openMenu}
          >
            <IconMenu />
          </button>

          <Link href="/" className="flex min-w-0 flex-col items-start">
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
            <span className="text-[10px] text-muted">{season}</span>
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
              className="grid h-12 w-12 place-items-center rounded-full border border-border text-text md:hidden"
              aria-label="Buscar"
            >
              <IconSearch />
            </Link>
            <Link
              href="/carrito"
              className="relative grid h-12 w-12 place-items-center rounded-full border border-border text-text"
              aria-label="Carrito"
            >
              <IconCart />
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
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={closeMenu}
          role="presentation"
        >
          <div
            className="flex h-full w-[86%] max-w-sm flex-col bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              {expandedRoot ? (
                <button
                  type="button"
                  className="flex min-h-12 items-center gap-1 text-sm font-semibold text-text"
                  onClick={() => setExpandedRootId(null)}
                  aria-label="Volver al menú"
                >
                  <IconChevronLeft size={18} />
                  Menú
                </button>
              ) : (
                <div>
                  <p className="text-sm font-bold tracking-[0.12em]">ACTIVATE</p>
                  <p className="text-[10px] text-muted">{season}</p>
                </div>
              )}
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-full border border-border text-text"
                onClick={closeMenu}
                aria-label="Cerrar menú"
              >
                <IconClose />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {expandedRoot ? (
                <div className="flex flex-col gap-1">
                  <p className="mb-2 text-lg font-bold">{expandedRoot.name}</p>
                  <Link
                    href={`/c/${expandedRoot.slug}`}
                    className="flex min-h-12 items-center justify-between rounded-[12px] border border-border bg-surface-soft px-4 text-sm font-semibold"
                    onClick={closeMenu}
                  >
                    Ver todo {expandedRoot.name}
                    <IconChevronRight />
                  </Link>
                  {expandedChildren.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/c/${ch.slug}`}
                      className="flex min-h-12 items-center justify-between border-b border-border px-1 text-sm font-medium"
                      onClick={closeMenu}
                    >
                      {ch.name}
                      <IconChevronRight className="text-muted" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {roots.map((r) => {
                    const hasChildren = childrenOf(r.id).length > 0;
                    if (hasChildren) {
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="flex min-h-12 w-full items-center justify-between rounded-[12px] border border-border bg-surface px-4 text-left text-base font-bold"
                          onClick={() => setExpandedRootId(r.id)}
                        >
                          {r.name}
                          <IconChevronRight />
                        </button>
                      );
                    }
                    return (
                      <Link
                        key={r.id}
                        href={`/c/${r.slug}`}
                        className="flex min-h-12 items-center justify-between rounded-[12px] border border-border px-4 text-base font-bold"
                        onClick={closeMenu}
                      >
                        {r.name}
                        <IconChevronRight />
                      </Link>
                    );
                  })}

                  <div className="mt-4 flex flex-col border-t border-border pt-3">
                    <Link
                      href="/buscar"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center text-sm font-semibold"
                    >
                      Buscar
                    </Link>
                    <Link
                      href="/pedido"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center text-sm font-semibold"
                    >
                      Consultar pedido
                    </Link>
                    <Link
                      href="/quienes-somos"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center text-sm font-semibold"
                    >
                      Quiénes somos
                    </Link>
                    <Link
                      href="/envios"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center text-sm text-muted"
                    >
                      Envíos
                    </Link>
                    <Link
                      href="/medios-de-pago"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center text-sm text-muted"
                    >
                      Medios de pago
                    </Link>
                    <Link
                      href="/cambios-y-devoluciones"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center text-sm text-muted"
                    >
                      Cambios y devoluciones
                    </Link>
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex min-h-12 items-center gap-2 text-sm font-semibold text-accent"
                        onClick={closeMenu}
                      >
                        <IconWhatsApp size={18} />
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function StoreFooter() {
  const settings = trpc.settings.getPublic.useQuery();
  const wa = whatsappHref(settings.data?.whatsapp);
  const ig = settings.data?.instagram?.trim();

  return (
    <footer className="mt-auto border-t border-border bg-surface-soft">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6 lg:gap-12 lg:px-8 lg:py-14">
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
          {wa ? (
            <a href={wa} target="_blank" rel="noreferrer" className="font-semibold text-accent">
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
  const href = whatsappHref(settings.data?.whatsapp);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="wa-fab fixed z-40 grid h-14 w-14 place-items-center rounded-full bg-wa text-white shadow-lg"
      aria-label="WhatsApp"
    >
      <IconWhatsApp size={24} />
    </a>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

/** Primary catalog entry when no roots loaded yet. */
export const PRODUCTS_HREF = "/c/mujer";

export function PromoBar() {
  const settings = trpc.settings.getPublic.useQuery();
  const bps = settings.data?.payment_discount_bps ?? 1000;
  return (
    <div className="store-promo type-caption border-b border-border bg-bg px-4 py-2 text-center font-semibold tracking-[0.04em] text-text">
      {formatPromoBarCopy(bps)}
    </div>
  );
}

type Cat = { id: string; name: string; slug: string; parent_id: string | null; sort_order: number };

const DESKTOP_NAV: { href: string; label: string }[] = [
  { href: "/", label: "Inicio" },
  { href: PRODUCTS_HREF, label: "Productos" },
  { href: "/quienes-somos", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

type LogoSize = "sm" | "md" | "lg";

/** Mark + ACTIVATE — sizes split so mobile stays compact and desktop readable. */
function BrandWordmark({ size = "md" }: { size?: LogoSize }) {
  const mark =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  const word =
    size === "sm"
      ? "text-[11px] tracking-[0.14em]"
      : size === "lg"
        ? "text-[15px] tracking-[0.16em]"
        : "text-[13px] tracking-[0.14em]";
  const px = size === "sm" ? 20 : size === "lg" ? 40 : 28;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <Image
        src="/brand/logo-mark-128.png"
        alt=""
        width={px}
        height={px}
        className={`brand-logo__mark shrink-0 object-contain ${mark}`}
        priority
        sizes={`${px}px`}
      />
      <span className={`brand-wordmark uppercase leading-none text-text ${word}`}>Activate</span>
    </span>
  );
}

export function StoreHeader() {
  const pathname = usePathname();
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
  const productsHref = roots[0] ? `/c/${roots[0].slug}` : PRODUCTS_HREF;

  function openMenu() {
    setExpandedRootId(null);
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    setExpandedRootId(null);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setExpandedRootId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function navActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Opaque white header only — never transparent over hero */}
      <header className="store-header w-full border-b border-border bg-surface">
        {/* Mobile: ☰ | logo | 🔍 🛒 — single white row */}
        <div className="mx-auto grid h-14 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-1 bg-surface px-2 sm:px-3 lg:hidden">
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center text-text"
            aria-label="Abrir menú"
            onClick={openMenu}
          >
            <IconMenu />
          </button>

          <Link
            href="/"
            className="flex min-w-0 max-w-[150px] items-center justify-center justify-self-center overflow-hidden"
            aria-label="Activate — inicio"
          >
            <BrandWordmark size="sm" />
          </Link>

          <div className="flex shrink-0 items-center justify-end">
            <Link
              href="/buscar"
              className="grid h-11 w-11 place-items-center text-text"
              aria-label="Buscar"
            >
              <IconSearch />
            </Link>
            <Link
              href="/carrito"
              className="relative grid h-11 w-11 place-items-center text-text"
              aria-label="Carrito"
            >
              <IconCart />
              {count > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-0.5 text-[10px] font-bold leading-none text-inverse">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        {/* Desktop: logo | Inicio Productos Nosotros Contacto | search+cart */}
        <div className="mx-auto hidden h-16 w-full max-w-7xl items-center justify-between gap-4 bg-surface px-6 lg:flex lg:px-8">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Activate — inicio">
            <BrandWordmark size="lg" />
          </Link>

          <nav className="flex flex-1 items-center justify-center gap-6 font-body text-[13px] font-semibold tracking-wide text-text xl:gap-8">
            {DESKTOP_NAV.map((item) => {
              const href = item.label === "Productos" ? productsHref : item.href;
              const active =
                item.label === "Productos"
                  ? Boolean(pathname?.startsWith("/c/") || pathname?.startsWith("/p/"))
                  : navActive(href);
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={
                    active
                      ? "text-accent underline decoration-2 underline-offset-8"
                      : "hover:text-accent"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-0.5">
            <Link
              href="/buscar"
              className="grid h-10 w-10 place-items-center text-text hover:text-accent"
              aria-label="Buscar"
            >
              <IconSearch />
            </Link>
            <Link
              href="/carrito"
              className="relative grid h-10 w-10 place-items-center text-text hover:text-accent"
              aria-label="Carrito"
            >
              <IconCart />
              {count > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-0.5 text-[10px] font-bold leading-none text-inverse">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-[#12100f66]"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <div
            className="menu-drawer relative flex h-full w-[min(300px,86%)] max-w-sm flex-col bg-surface shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-6">
              {expandedRoot ? (
                <button
                  type="button"
                  className="flex min-h-12 items-center gap-2 text-lg font-bold text-text"
                  onClick={() => setExpandedRootId(null)}
                  aria-label="Volver al menú"
                >
                  <IconChevronLeft size={18} />
                  {expandedRoot.name}
                </button>
              ) : (
                <div className="min-w-0 pt-1">
                  <p className="text-lg font-bold tracking-[0.12em] text-text">ACTIVATE</p>
                  <p className="mt-1 text-xs text-muted">{season}</p>
                </div>
              )}
              <button
                type="button"
                className="grid h-12 w-12 shrink-0 place-items-center text-text"
                onClick={closeMenu}
                aria-label="Cerrar menú"
              >
                <IconClose />
              </button>
            </div>

            <div className="mx-5 border-b border-border" />

            <div className="flex-1 overflow-y-auto px-5 py-2 pb-[max(1.5rem,var(--safe-bottom))]">
              {expandedRoot ? (
                <div className="flex flex-col">
                  <Link
                    href={`/c/${expandedRoot.slug}`}
                    className="flex min-h-12 items-center justify-between py-3 text-[15px] font-bold text-text"
                    onClick={closeMenu}
                  >
                    Ver todo {expandedRoot.name}
                    <IconChevronRight size={16} className="text-muted" />
                  </Link>
                  {expandedChildren.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/c/${ch.slug}`}
                      className="flex min-h-12 items-center justify-between py-3 text-[15px] font-medium text-text"
                      onClick={closeMenu}
                    >
                      {ch.name}
                      <IconChevronRight size={16} className="text-muted" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col">
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="flex min-h-12 items-center py-3.5 text-lg font-bold text-text"
                  >
                    Inicio
                  </Link>
                  <Link
                    href={productsHref}
                    onClick={closeMenu}
                    className="flex min-h-12 items-center justify-between py-3.5 text-lg font-bold text-text"
                  >
                    Productos
                    <IconChevronRight size={18} className="text-muted" />
                  </Link>
                  {roots.map((r) => {
                    const hasChildren = childrenOf(r.id).length > 0;
                    if (hasChildren) {
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="flex min-h-12 w-full items-center justify-between py-3.5 text-left text-lg font-bold text-text"
                          onClick={() => setExpandedRootId(r.id)}
                        >
                          {r.name}
                          <IconChevronRight size={18} className="text-muted" />
                        </button>
                      );
                    }
                    return (
                      <Link
                        key={r.id}
                        href={`/c/${r.slug}`}
                        className="flex min-h-12 items-center justify-between py-3.5 text-lg font-bold text-text"
                        onClick={closeMenu}
                      >
                        {r.name}
                        <IconChevronRight size={18} className="text-muted" />
                      </Link>
                    );
                  })}

                  <div className="mt-2 border-t border-border pt-1">
                    <Link
                      href="/buscar"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center py-3 text-[15px] font-medium text-text"
                    >
                      Buscar
                    </Link>
                    <Link
                      href="/quienes-somos"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center py-3 text-[15px] font-medium text-text"
                    >
                      Nosotros
                    </Link>
                    <Link
                      href="/contacto"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center py-3 text-[15px] font-medium text-text"
                    >
                      Contacto
                    </Link>
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-12 items-center gap-2 py-3 text-[15px] font-medium text-text"
                        onClick={closeMenu}
                      >
                        <IconWhatsApp size={18} className="text-wa" />
                        WhatsApp
                      </a>
                    ) : null}
                    <Link
                      href="/pedido"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center py-3 text-[15px] font-medium text-muted"
                    >
                      Consultar pedido
                    </Link>
                    <Link
                      href="/envios"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center py-3 text-[15px] font-medium text-muted"
                    >
                      Envíos
                    </Link>
                    <Link
                      href="/medios-de-pago"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center py-3 text-[15px] font-medium text-muted"
                    >
                      Medios de pago
                    </Link>
                    <Link
                      href="/cambios-y-devoluciones"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center py-3 text-[15px] font-medium text-muted"
                    >
                      Cambios y devoluciones
                    </Link>
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
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo-mark.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <p className="text-base font-bold tracking-[0.12em] text-text">ACTIVATE</p>
          </div>
          <p className="mt-3 text-sm text-muted">Moda deportiva · San Manuel</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <Link href="/pedido" className="hover:text-text">
            Consultar pedido
          </Link>
          <Link href="/envios" className="hover:text-text">
            Envíos
          </Link>
          <Link href="/medios-de-pago" className="hover:text-text">
            Medios de pago
          </Link>
          <Link href="/cambios-y-devoluciones" className="hover:text-text">
            Cambios y devoluciones
          </Link>
          <Link href="/terminos" className="hover:text-text">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="hover:text-text">
            Privacidad
          </Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-accent"
            >
              <IconWhatsApp size={18} />
              WhatsApp
            </a>
          ) : (
            <span className="text-muted">WhatsApp (configurar en admin)</span>
          )}
          {ig ? (
            <a href={ig} target="_blank" rel="noreferrer" className="text-muted hover:text-text">
              Instagram
            </a>
          ) : null}
          <Link href="/contacto" className="text-muted hover:text-text">
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab({ hideOnHome = false }: { hideOnHome?: boolean }) {
  const pathname = usePathname();
  const settings = trpc.settings.getPublic.useQuery();
  const href = whatsappHref(settings.data?.whatsapp);
  if (!href) return null;
  if (hideOnHome && pathname === "/") return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="wa-fab fixed z-40 grid h-[52px] w-[52px] place-items-center rounded-full bg-wa text-white shadow-lg"
      aria-label="WhatsApp"
    >
      <IconWhatsApp size={24} />
    </a>
  );
}

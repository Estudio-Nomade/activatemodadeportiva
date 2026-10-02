"use client";

import Image from "next/image";
import Link from "next/link";
import { PRODUCTS_HREF } from "@/components/store/chrome";
import { discountPercentFromBps } from "@/lib/format/promo";
import { categoryTileImageSrc } from "@/lib/media/category-tile";
import { trpc } from "@/lib/trpc/client";

export default function HomePage() {
  const cats = trpc.catalog.listCategories.useQuery();
  const settings = trpc.settings.getPublic.useQuery();
  const roots = (cats.data ?? [])
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const discPct = discountPercentFromBps(settings.data?.payment_discount_bps ?? 1000);
  // Stable href before cats load — avoids CTA jump on hydrate
  const primaryHref = roots[0] ? `/c/${roots[0].slug}` : PRODUCTS_HREF;

  return (
    <div>
      {/*
        Hero in normal document flow BELOW sticky chrome.
        Claim LEFT + 4 explicit lines — CSS classes only (no JS layout flip).
      */}
      <section className="home-hero relative z-0 min-h-[68vh] w-full overflow-hidden md:min-h-[72vh] lg:min-h-[min(78vh,720px)]">
        <Image
          src="/home/hero.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-t from-[#12100fcc] via-[#12100f66] to-[#12100f20]"
          aria-hidden
        />
        <div className="home-hero__content relative z-[2] flex min-h-[68vh] flex-col justify-end gap-6 px-5 pb-12 pt-10 md:min-h-[72vh] md:gap-8 md:px-10 md:pb-16 lg:min-h-[min(78vh,720px)] lg:px-14">
          <div className="home-hero__claim w-full text-left drop-shadow-sm">
            <h1 className="home-hero__title">
              <span>DISCIPLINA</span>
              <span>EN MOVIMIENTO</span>
            </h1>
            <p className="home-hero__sub">
              <span>Más que ropa deportiva</span>
              <span>es una forma de vida.</span>
            </p>
          </div>
          <Link
            href={primaryHref}
            className="home-hero__cta btn type-cta mt-0 min-h-12 w-fit self-start border-0 bg-surface px-8 text-text shadow-sm transition hover:opacity-95 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse md:min-h-[52px] md:px-10"
          >
            Ver colección
          </Link>
        </div>
      </section>

      <section className="space-y-3 px-4 py-6 md:px-6 md:py-12 lg:px-8 lg:py-14">
        <h2 className="font-display text-[26px] font-medium leading-[1.25] md:text-[36px] md:font-semibold md:leading-[1.2]">
          Comprá por categoría
        </h2>
        <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-5">
          {roots.map((root) => (
            <Link
              key={root.id}
              href={`/c/${root.slug}`}
              className="group relative block h-[110px] overflow-hidden rounded-[12px] md:h-[180px] lg:h-[200px] lg:rounded-[16px]"
            >
              <Image
                src={categoryTileImageSrc(root.slug)}
                alt=""
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                sizes="(min-width: 768px) 33vw, 100vw"
              />
              <span className="absolute inset-0 flex items-center justify-between bg-[#12100f66] px-4 font-display text-xl font-semibold text-inverse">
                {root.name}
                <span aria-hidden className="text-lg opacity-90">
                  ›
                </span>
              </span>
            </Link>
          ))}
        </div>
        {cats.isError ? (
          <p className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            No pudimos cargar categorías. Si es la primera vez, aplicá el bootstrap SQL en Supabase.
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-2.5 px-4 pb-8 md:grid-cols-4 md:gap-4 md:px-6 md:pb-12 lg:px-8 lg:pb-14">
        {[
          { t: `${discPct}% off`, d: "Transferencia o efectivo" },
          { t: "Envíos", d: "Andreani a todo el país" },
          { t: "Cambios", d: "Consultanos por WhatsApp" },
          { t: "Local", d: "Retiro en San Manuel" },
        ].map((b) => (
          <div
            key={b.t}
            className="rounded-[12px] border border-border bg-surface p-3.5 md:p-5 lg:rounded-[16px]"
          >
            <p className="font-display text-[13px] font-semibold text-text md:text-sm">{b.t}</p>
            <p className="type-caption mt-1 text-muted md:text-sm md:leading-normal">{b.d}</p>
          </div>
        ))}
      </section>

      <section className="relative mx-0 mb-0 min-h-[220px] overflow-hidden bg-surface-soft md:mx-6 md:mb-14 md:rounded-[20px] lg:mx-8">
        <Image
          src="/home/hero.jpg"
          alt=""
          fill
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#12100f99]" aria-hidden />
        <div className="relative z-10 flex min-h-[220px] flex-col items-start justify-center gap-2 px-6 py-10 md:px-12 md:py-14 lg:px-16">
          <p className="font-display max-w-[28ch] text-[22px] font-semibold leading-snug text-inverse md:text-[36px] md:leading-[1.2]">
            Entrená cómoda. Viví a tu ritmo.
          </p>
          <p className="type-body text-[13px] text-inverse/85 md:text-base">
            Moda deportiva desde San Manuel · ACTIVATE
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/quienes-somos"
              className="btn type-cta h-11 max-w-[200px] border-0 bg-surface px-5 text-text"
            >
              Nosotros
            </Link>
            <Link
              href={primaryHref}
              className="type-cta inline-flex h-11 items-center text-inverse underline-offset-2 hover:underline"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

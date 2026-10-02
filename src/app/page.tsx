"use client";

import Image from "next/image";
import Link from "next/link";
import { PRODUCTS_HREF } from "@/components/store/chrome";
import { HomeCategoryBlocks } from "@/components/store/home-category-blocks";
import { discountPercentFromBps } from "@/lib/format/promo";
import { trpc } from "@/lib/trpc/client";

export default function HomePage() {
  const cats = trpc.catalog.listCategories.useQuery();
  const settings = trpc.settings.getPublic.useQuery();
  const roots = (cats.data ?? [])
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const discPct = discountPercentFromBps(settings.data?.payment_discount_bps ?? 1000);
  // Wait for settings so we don't flash fallback → DB value on hydrate
  const seasonLabel =
    settings.data === undefined
      ? null
      : settings.data.season_label?.trim() || "Colección Primavera / Verano";
  // Stable href before cats load — avoids CTA jump on hydrate
  const primaryHref = roots[0] ? `/c/${roots[0].slug}` : PRODUCTS_HREF;

  return (
    <div>
      {/*
        Hero in normal document flow BELOW sticky chrome.
        Claim LEFT + 4 explicit lines — CSS classes only (no JS layout flip).
        Mobile height via .home-hero / .home-hero__content in globals.css.
      */}
      <section className="home-hero relative z-0 w-full overflow-hidden">
        <Image
          src="/home/hero-portada.jpg"
          alt=""
          fill
          priority
          className="home-hero__photo"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-t from-[#12100fcc] via-[#12100f66] to-[#12100f20]"
          aria-hidden
        />
        <div className="home-hero__content relative z-[2] px-5 md:px-10 lg:px-14">
          <div className="home-hero__claim w-full text-left drop-shadow-sm">
            {seasonLabel ? <p className="home-hero__season">{seasonLabel}</p> : null}
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

      <HomeCategoryBlocks categories={cats.data ?? []} isError={cats.isError} />

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
          src="/home/hero-portada.jpg"
          alt=""
          fill
          className="home-hero__photo home-hero__photo--soft opacity-40"
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

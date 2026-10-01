"use client";

import Image from "next/image";
import Link from "next/link";
import { discountPercentFromBps } from "@/lib/format/promo";
import { categoryTileImageSrc } from "@/lib/media/category-tile";
import { trpc } from "@/lib/trpc/client";

export default function HomePage() {
  const cats = trpc.catalog.listCategories.useQuery();
  const settings = trpc.settings.getPublic.useQuery();
  const roots = (cats.data ?? [])
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const season = settings.data?.season_label?.trim() || "Colección";
  const discPct = discountPercentFromBps(settings.data?.payment_discount_bps ?? 1000);
  const primaryHref = roots[0] ? `/c/${roots[0].slug}` : "/buscar";

  return (
    <div>
      {/* Mobile: full-bleed hero · Desktop 61: split hero */}
      <section className="md:grid md:min-h-[480px] md:grid-cols-2 md:bg-surface">
        <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden md:min-h-full md:order-2">
          <Image
            src="/home/hero.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#2c2a28cc] via-[#2c2a2840] to-transparent md:bg-gradient-to-l md:from-[#2c2a28aa] md:via-transparent md:to-transparent"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-2 px-5 py-8 text-white md:hidden">
            <p className="text-xs font-semibold tracking-[0.14em] opacity-90 uppercase">
              {season}
            </p>
            <h1 className="max-w-[14ch] text-[28px] font-bold leading-tight">Movete a tu ritmo</h1>
            <Link
              href={primaryHref}
              className="btn btn-ghost mt-2 max-w-[200px] self-start border-0 bg-surface text-text"
            >
              Ver colección
            </Link>
          </div>
        </div>

        <div className="hidden flex-col justify-center gap-5 px-10 py-16 md:flex md:order-1">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{season}</p>
          <h1 className="max-w-[12ch] text-5xl font-bold leading-[1.1] text-text">
            Movete a tu ritmo
          </h1>
          <p className="max-w-md text-base text-muted">
            Moda deportiva para entrenar y vivir el día. Retiro en San Manuel o envío Andreani.
          </p>
          <Link href={primaryHref} className="btn btn-primary mt-2 max-w-[240px]">
            Ver colección
          </Link>
        </div>
      </section>

      <section className="space-y-3 px-4 py-6 md:px-6 md:py-10">
        <h2 className="text-lg font-bold md:text-xl">Comprá por categoría</h2>
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-4">
          {roots.map((root) => (
            <Link
              key={root.id}
              href={`/c/${root.slug}`}
              className="group relative block h-[100px] overflow-hidden rounded-[12px] md:h-[160px]"
            >
              <Image
                src={categoryTileImageSrc(root.slug)}
                alt=""
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                sizes="(min-width: 768px) 33vw, 100vw"
              />
              <span className="absolute inset-0 flex items-center justify-between bg-[#2c2a2866] px-4 text-xl font-bold text-white">
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

      <section className="grid grid-cols-2 gap-2.5 px-4 pb-6 md:grid-cols-4 md:gap-3 md:px-6 md:pb-10">
        {[
          { t: `${discPct}% off`, d: "Transferencia o efectivo" },
          { t: "Envíos", d: "Andreani a todo el país" },
          { t: "Cambios", d: "Consultanos por WhatsApp" },
          { t: "Local", d: "Retiro en San Manuel" },
        ].map((b) => (
          <div key={b.t} className="rounded-[12px] border border-border bg-surface p-3.5 md:p-4">
            <p className="text-[13px] font-bold text-text">{b.t}</p>
            <p className="mt-1 text-[11px] text-muted md:text-sm">{b.d}</p>
          </div>
        ))}
      </section>

      <section className="mx-4 mb-10 overflow-hidden rounded-[16px] border border-border bg-surface md:mx-6">
        <div className="flex flex-col items-center gap-4 px-6 py-10 text-center md:flex-row md:gap-10 md:px-12 md:py-12 md:text-left">
          <Image
            src="/brand/logo.png"
            alt="Activate"
            width={160}
            height={48}
            className="h-12 w-auto object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-[0.12em] text-text">ACTIVATE</p>
            <p className="mt-2 text-sm text-muted md:text-base">
              Moda deportiva desde San Manuel. Entrená cómoda, viví a tu ritmo.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link href="/quienes-somos" className="btn btn-secondary h-11 px-5 text-sm">
                Quiénes somos
              </Link>
              <Link href={primaryHref} className="text-sm font-semibold text-accent hover:underline">
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

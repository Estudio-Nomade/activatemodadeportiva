"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

export default function HomePage() {
  const cats = trpc.catalog.listCategories.useQuery();
  const settings = trpc.settings.getPublic.useQuery();
  const roots = (cats.data ?? []).filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (id: string) =>
    (cats.data ?? []).filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <section className="relative flex min-h-[320px] flex-col justify-end bg-[linear-gradient(180deg,transparent_35%,#2c2a28cc),url('https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80')] bg-cover bg-center px-5 py-8 text-white md:min-h-[420px] md:px-10">
        <p className="text-xs font-semibold tracking-[0.14em] opacity-90">
          {settings.data?.season_label ?? "Colección"}
        </p>
        <h1 className="mt-2 max-w-[14ch] text-3xl font-bold leading-tight md:text-5xl">
          Activá tu estilo
        </h1>
        <Link href="/c/mujer" className="btn btn-primary mt-5 max-w-[220px] bg-white text-text">
          Ver colección
        </Link>
      </section>

      <section className="space-y-4 px-4 py-8 md:px-6">
        <h2 className="text-xl font-bold">Categorías</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {roots.map((root) => (
            <div key={root.id} className="rounded-[16px] border border-border bg-surface p-4">
              <Link href={`/c/${root.slug}`} className="text-lg font-bold text-accent">
                {root.name}
              </Link>
              <ul className="mt-3 space-y-1">
                {childrenOf(root.id).map((ch) => (
                  <li key={ch.id}>
                    <Link href={`/c/${ch.slug}`} className="text-sm text-muted hover:text-text">
                      {ch.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {cats.isError ? (
          <p className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            No pudimos cargar categorías. Si es la primera vez, aplicá el bootstrap SQL en Supabase.
          </p>
        ) : null}
      </section>

      <section className="grid gap-3 px-4 pb-10 md:grid-cols-4 md:px-6">
        {[
          { t: "10% off", d: "Transferencia y efectivo" },
          { t: "Envíos", d: "Andreani a todo el país" },
          { t: "Retiro", d: "Gratis en San Manuel" },
          { t: "Cambios", d: "Consultá por WhatsApp" },
        ].map((b) => (
          <div key={b.t} className="rounded-[16px] bg-accent-soft p-4">
            <p className="font-bold text-accent">{b.t}</p>
            <p className="mt-1 text-sm text-muted">{b.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

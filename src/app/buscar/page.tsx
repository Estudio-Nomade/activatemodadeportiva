"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/store/product-card";
import { trpc } from "@/lib/trpc/client";

function SearchPageInner({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = trpc.catalog.search.useQuery(
    { q: submitted },
    { enabled: submitted.length >= 1 },
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = q.trim();
    setSubmitted(next);
    const href = next ? `/buscar?q=${encodeURIComponent(next)}` : "/buscar";
    router.replace(href, { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <form className="flex gap-2" onSubmit={onSubmit} role="search">
        <input
          ref={inputRef}
          type="search"
          name="q"
          className="min-h-12 flex-1 rounded-[12px] border border-border bg-surface px-4 text-base text-text outline-none placeholder:text-muted focus:border-accent"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Calza, medias, remera…"
          autoComplete="off"
          aria-label="Buscar productos"
        />
        <button type="submit" className="btn btn-primary w-auto shrink-0 px-5 sm:px-6">
          Buscar
        </button>
      </form>

      {!submitted ? (
        <p className="mt-6 text-sm text-muted">Escribí un producto o categoría para buscar.</p>
      ) : null}

      {submitted && results.isLoading ? (
        <p className="mt-6 text-sm text-muted">Buscando…</p>
      ) : null}

      {submitted && !results.isLoading && (results.data?.length ?? 0) === 0 ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-text">
            No encontramos resultados para “{submitted}”.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/c/mujer" className="chip">
              Mujer
            </Link>
            <Link href="/c/hombre" className="chip">
              Hombre
            </Link>
            <Link href="/c/accesorios" className="chip">
              Accesorios
            </Link>
          </div>
        </div>
      ) : null}

      {submitted && !results.isLoading && (results.data?.length ?? 0) > 0 ? (
        <p className="mt-6 text-sm text-muted">
          {results.data!.length} resultado{results.data!.length === 1 ? "" : "s"} para “
          {submitted}”
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {(results.data ?? []).map((p) => (
          <ProductCard key={p.id} product={p} soldOut={p.is_sold_out} />
        ))}
      </div>
    </div>
  );
}

function SearchFromUrl() {
  const sp = useSearchParams();
  const initialQ = (sp.get("q") ?? "").trim();
  return <SearchPageInner key={initialQ} initialQ={initialQ} />;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
          <div className="h-12 animate-pulse rounded-[12px] bg-surface-soft" />
          <p className="mt-6 text-sm text-muted">Cargando…</p>
        </div>
      }
    >
      <SearchFromUrl />
    </Suspense>
  );
}

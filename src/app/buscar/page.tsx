"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { IconSearch } from "@/components/store/icons";
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

  const products = results.data?.products ?? [];
  const categories = results.data?.categories ?? [];
  const hasProducts = products.length > 0;
  const hasCategories = categories.length > 0;
  const empty =
    submitted.length >= 1 && !results.isLoading && !hasProducts && !hasCategories;
  const onlyEmptyCategories =
    submitted.length >= 1 && !results.isLoading && !hasProducts && hasCategories;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <form
        className="page-search mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2"
        onSubmit={onSubmit}
        role="search"
      >
        <div className="relative min-w-0 flex-1">
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          >
            <IconSearch size={18} />
          </span>
          <input
            ref={inputRef}
            type="search"
            name="q"
            className="min-h-12 w-full rounded-[12px] border border-border bg-surface py-3 pl-11 pr-4 text-base text-text outline-none placeholder:text-muted focus:border-accent"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Calza, medias, remera…"
            autoComplete="off"
            aria-label="Buscar productos"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-inline shrink-0 px-6">
          Buscar
        </button>
      </form>

      {!submitted ? (
        <p className="mx-auto mt-6 max-w-xl text-sm text-muted">
          Escribí un producto o categoría para buscar.
        </p>
      ) : null}

      {submitted && results.isLoading ? (
        <p className="mt-6 text-sm text-muted">Buscando…</p>
      ) : null}

      {empty ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-text">
            No encontramos resultados para “{submitted}”.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/c/mujer" className="chip uppercase tracking-wide">
              Mujer
            </Link>
            <Link href="/c/hombre" className="chip uppercase tracking-wide">
              Hombre
            </Link>
            <Link href="/c/accesorios" className="chip uppercase tracking-wide">
              Accesorios
            </Link>
          </div>
        </div>
      ) : null}

      {hasCategories ? (
        <div className="mt-8">
          <p className="text-sm font-semibold text-text">Categorías</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="chip uppercase tracking-wide"
              >
                {c.name}
              </Link>
            ))}
          </div>
          {onlyEmptyCategories ? (
            <p className="mt-4 text-sm text-muted">
              Todavía no hay productos publicados en{" "}
              {categories.length === 1 ? (
                <>
                  “{categories[0]!.name}”. Podés entrar a la categoría o seguir
                  buscando.
                </>
              ) : (
                "estas categorías. Podés entrar a cada una o seguir buscando."
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasProducts ? (
        <>
          <p className="mt-6 text-sm text-muted">
            {products.length} producto{products.length === 1 ? "" : "s"} para “
            {submitted}”
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} soldOut={p.is_sold_out} />
            ))}
          </div>
        </>
      ) : null}
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
          <div className="mx-auto h-12 max-w-xl animate-pulse rounded-[12px] bg-surface-soft" />
          <p className="mx-auto mt-6 max-w-xl text-sm text-muted">Cargando…</p>
        </div>
      }
    >
      <SearchFromUrl />
    </Suspense>
  );
}

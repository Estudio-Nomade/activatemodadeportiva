"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { trpc } from "@/lib/trpc/client";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const results = trpc.catalog.search.useQuery(
    { q: submitted },
    { enabled: submitted.length >= 1 },
  );

  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold">Buscar</h1>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <input
          className="min-h-12 flex-1 rounded-[12px] border border-border bg-surface px-4"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Calza, medias, remera…"
        />
        <button type="submit" className="btn btn-primary w-auto px-6">
          Buscar
        </button>
      </form>

      {submitted && results.isLoading ? <p className="mt-4 text-sm text-muted">Buscando…</p> : null}
      {submitted && !results.isLoading && (results.data?.length ?? 0) === 0 ? (
        <div className="mt-8 space-y-3 text-sm">
          <p>No encontramos resultados para “{submitted}”.</p>
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

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {(results.data ?? []).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

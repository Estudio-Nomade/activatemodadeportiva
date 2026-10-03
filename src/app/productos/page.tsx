"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/store/product-card";
import { trpc } from "@/lib/trpc/client";

type Cat = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

/**
 * Full catalog: all published products, then filter by root/subcategory.
 * Mobile hamburger "Productos" lands here.
 */
export default function ProductosPage() {
  const cats = trpc.catalog.listCategories.useQuery();
  const products = trpc.catalog.listProducts.useQuery({});
  /** null = all products */
  const [filterSlug, setFilterSlug] = useState<string | null>(null);

  const roots = useMemo(
    () =>
      (cats.data ?? [])
        .filter((c) => !c.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [cats.data],
  );

  const childrenOf = (parentId: string) =>
    (cats.data ?? [])
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

  const activeCat: Cat | undefined = filterSlug
    ? (cats.data ?? []).find((c) => c.slug === filterSlug)
    : undefined;

  const activeRoot: Cat | undefined = activeCat
    ? activeCat.parent_id
      ? (cats.data ?? []).find((c) => c.id === activeCat.parent_id)
      : activeCat
    : undefined;

  const subchips = activeRoot ? childrenOf(activeRoot.id) : [];

  const categoryIdsInFilter = useMemo(() => {
    if (!filterSlug || !cats.data?.length) return null;
    const all = cats.data;
    const start = all.find((c) => c.slug === filterSlug);
    if (!start) return new Set<string>();
    const ids = new Set<string>([start.id]);
    // include full subtree
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of all) {
        if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
          ids.add(c.id);
          grew = true;
        }
      }
    }
    return ids;
  }, [filterSlug, cats.data]);

  const list = useMemo(() => {
    const rows = products.data ?? [];
    if (!categoryIdsInFilter) return rows;
    return rows.filter((p) => categoryIdsInFilter.has(p.category_id));
  }, [products.data, categoryIdsInFilter]);

  const empty = !products.isLoading && !products.isError && list.length === 0;

  return (
    <div className="pb-8 md:pb-12">
      <div className="px-4 pt-6 md:px-6 lg:px-8 lg:pt-10">
        <h1 className="text-2xl font-bold uppercase tracking-wide md:text-3xl lg:text-4xl">Productos</h1>
        <p className="mt-1 text-sm text-muted">
          {filterSlug && activeCat
            ? `Filtrando: ${activeCat.name}`
            : "Toda la colección"}
        </p>
      </div>

      {/* Root filters: Todas | Mujer | Hombre | Accesorios */}
      <div className="mt-3 flex gap-2 overflow-x-auto border-b border-border bg-surface px-4 py-3 md:mt-5 md:px-6 lg:px-8">
        <button
          type="button"
          className="chip shrink-0 uppercase tracking-wide"
          data-active={!filterSlug ? "true" : "false"}
          onClick={() => setFilterSlug(null)}
        >
          Todas
        </button>
        {roots.map((r) => (
          <button
            key={r.id}
            type="button"
            className="chip shrink-0 uppercase tracking-wide"
            data-active={
              activeRoot?.id === r.id || filterSlug === r.slug ? "true" : "false"
            }
            onClick={() => setFilterSlug(r.slug)}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Subcategory chips when a root (or its child) is active */}
      {subchips.length > 0 && activeRoot ? (
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-bg px-4 py-2.5 md:px-6 lg:px-8">
          <button
            type="button"
            className="chip shrink-0 uppercase tracking-wide"
            data-active={filterSlug === activeRoot.slug ? "true" : "false"}
            onClick={() => setFilterSlug(activeRoot.slug)}
          >
            Todo {activeRoot.name}
          </button>
          {subchips.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className="chip shrink-0 uppercase tracking-wide"
              data-active={filterSlug === ch.slug ? "true" : "false"}
              onClick={() => setFilterSlug(ch.slug)}
            >
              {ch.name}
            </button>
          ))}
          <Link
            href={`/c/${activeRoot.slug}`}
            className="chip shrink-0 uppercase tracking-wide text-accent"
          >
            Ver categoría ›
          </Link>
        </div>
      ) : null}

      <div className="px-4 py-4 md:px-6 md:py-8 lg:px-8">
        {products.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
        {products.isError ? (
          <p className="text-sm text-danger">No se pudo cargar el catálogo.</p>
        ) : null}

        {empty ? (
          <div className="mt-4 rounded-[16px] border border-border bg-surface px-5 py-10 text-center md:mx-auto md:max-w-lg md:py-14">
            <p className="text-base font-semibold text-text">Sin productos por ahora</p>
            <p className="mt-2 text-sm text-muted">
              {filterSlug
                ? "No hay artículos publicados en este filtro."
                : "Todavía no hay artículos publicados."}
            </p>
            {filterSlug ? (
              <button
                type="button"
                className="btn btn-secondary mx-auto mt-5 max-w-[200px]"
                onClick={() => setFilterSlug(null)}
              >
                Ver todos
              </button>
            ) : (
              <Link href="/" className="btn btn-secondary mx-auto mt-5 max-w-[200px]">
                Ir al inicio
              </Link>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} soldOut={p.is_sold_out} />
          ))}
        </div>
      </div>
    </div>
  );
}

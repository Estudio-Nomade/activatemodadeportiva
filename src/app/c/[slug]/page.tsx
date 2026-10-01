"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { buildCategoryChips } from "@/lib/catalog/category-chips";
import { trpc } from "@/lib/trpc/client";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const cats = trpc.catalog.listCategories.useQuery();
  const products = trpc.catalog.listProducts.useQuery({ categorySlug: slug });
  const cat = (cats.data ?? []).find((c) => c.slug === slug);
  const chips = buildCategoryChips(cats.data ?? [], slug);

  const list = products.data ?? [];
  const empty = !products.isLoading && !products.isError && list.length === 0;

  return (
    <div>
      <div className="px-4 pt-6 md:px-6">
        <h1 className="text-2xl font-bold">{cat?.name ?? slug}</h1>
      </div>

      {chips.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto bg-surface px-4 py-3 md:px-6">
          {chips.map((chip) => (
            <Link
              key={chip.slug}
              href={`/c/${chip.slug}`}
              className="chip shrink-0"
              data-active={chip.active ? "true" : "false"}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="px-4 py-5 md:px-6">
        {products.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
        {products.isError ? (
          <p className="text-sm text-danger">No se pudo cargar el catálogo.</p>
        ) : null}

        {empty ? (
          <div className="mt-4 rounded-[16px] border border-border bg-surface px-5 py-10 text-center">
            <p className="text-base font-semibold text-text">Sin productos por ahora</p>
            <p className="mt-2 text-sm text-muted">
              Todavía no hay artículos publicados en esta categoría.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/" className="btn btn-secondary max-w-[200px]">
                Ir al inicio
              </Link>
              <Link href="/buscar" className="btn btn-ghost max-w-[200px]">
                Buscar
              </Link>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} soldOut={p.is_sold_out} />
          ))}
        </div>
      </div>
    </div>
  );
}

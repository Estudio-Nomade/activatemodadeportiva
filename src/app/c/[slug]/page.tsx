"use client";

import { useParams } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { trpc } from "@/lib/trpc/client";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const cats = trpc.catalog.listCategories.useQuery();
  const products = trpc.catalog.listProducts.useQuery({ categorySlug: slug });
  const cat = (cats.data ?? []).find((c) => c.slug === slug);

  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold">{cat?.name ?? slug}</h1>
      {products.isLoading ? <p className="mt-4 text-sm text-muted">Cargando…</p> : null}
      {products.isError ? (
        <p className="mt-4 text-sm text-danger">No se pudo cargar el catálogo.</p>
      ) : null}
      {!products.isLoading && (products.data?.length ?? 0) === 0 ? (
        <p className="mt-6 text-sm text-muted">Todavía no hay productos en esta categoría.</p>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {(products.data ?? []).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductImage } from "@/components/store/product-image";
import { useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { formatArsCents } from "@/lib/format/money";
import { primaryProductImageUrl } from "@/lib/media/product-image";
import { trpc } from "@/lib/trpc/client";

export default function AdminCatalogoPage() {
  const token = useAdminToken();
  const [q, setQ] = useState("");
  const catalog = trpc.admin.catalog.listProducts.useQuery(undefined, { enabled: !!token });
  const setPublished = trpc.admin.catalog.setPublished.useMutation();
  const setStock = trpc.admin.catalog.setVariantStock.useMutation();
  const utils = trpc.useUtils();

  const filtered = useMemo(() => {
    const list = catalog.data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (p) => p.name.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term),
    );
  }, [catalog.data, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{(catalog.data ?? []).length} productos</p>
        <Link href="/admin/catalogo/nuevo" className="btn btn-primary w-auto px-4">
          + Nuevo
        </Link>
      </div>

      <div className="field">
        <label htmlFor="search">Buscar</label>
        <input
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre o slug"
        />
      </div>

      {catalog.isLoading ? <p className="text-sm text-muted">Cargando catálogo…</p> : null}
      {catalog.isError ? <p className="text-sm text-danger">{errorMessage(catalog.error)}</p> : null}

      {!catalog.isLoading && filtered.length === 0 ? (
        <div className="rounded-[16px] border border-border bg-surface px-4 py-12 text-center">
          <p className="font-semibold">Catálogo vacío</p>
          <p className="mt-1 text-sm text-muted">Creá el primer producto para la tienda.</p>
          <Link href="/admin/catalogo/nuevo" className="btn btn-primary mx-auto mt-5 max-w-[220px]">
            Nuevo producto
          </Link>
        </div>
      ) : null}

      <ul className="space-y-3">
        {filtered.map((p) => {
          const stockTotal = (p.product_variants ?? []).reduce((n, v) => n + v.stock_on_hand, 0);
          const thumb = primaryProductImageUrl(p.product_images);
          return (
            <li key={p.id} className="rounded-[16px] border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-soft">
                    <ProductImage url={thumb} alt={p.name} className="h-full w-full" />
                  </div>
                  <div className="min-w-0">
                    <Link href={`/admin/catalogo/${p.id}`} className="font-semibold hover:text-accent">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted">
                      /{p.slug} · {formatArsCents(p.promo_price_cents ?? p.list_price_cents)} · stock{" "}
                      {stockTotal}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="chip"
                  data-active={p.is_published}
                  disabled={setPublished.isPending}
                  onClick={() =>
                    setPublished.mutate(
                      { id: p.id, isPublished: !p.is_published },
                      {
                        onSuccess: () => utils.admin.catalog.listProducts.invalidate(),
                        onError: (e) => window.alert(errorMessage(e)),
                      },
                    )
                  }
                >
                  {p.is_published ? "Publicado" : "Borrador"}
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {(p.product_variants ?? []).map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-28 text-muted">
                      {v.color} / {v.size}
                    </span>
                    <input
                      type="number"
                      min={0}
                      className="h-10 w-24 rounded-md border border-border px-2"
                      defaultValue={v.stock_on_hand}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n) || n === v.stock_on_hand) return;
                        setStock.mutate(
                          { variantId: v.id, stockOnHand: Math.max(0, Math.floor(n)) },
                          {
                            onSuccess: () => utils.admin.catalog.listProducts.invalidate(),
                            onError: (err) => window.alert(errorMessage(err)),
                          },
                        );
                      }}
                    />
                    <span className="text-xs text-muted">on hand</span>
                  </div>
                ))}
              </div>

              <Link
                href={`/admin/catalogo/${p.id}`}
                className="mt-3 inline-block text-sm font-semibold text-accent"
              >
                Editar →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

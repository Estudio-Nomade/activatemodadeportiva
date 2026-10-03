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
    // Search by visible name only (slug stays internal)
    return list.filter((p) => p.name.toLowerCase().includes(term));
  }, [catalog.data, q]);

  return (
    <div className="space-y-4">
      {/* Primary actions — full-width stack, not cramped side chips */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/admin/catalogo/nuevo"
          className="btn btn-primary min-h-12 w-full justify-center px-4 text-center !text-white"
          style={{ color: "#ffffff" }}
        >
          Nuevo producto
        </Link>
        <Link
          href="/admin/guias"
          className="btn btn-secondary min-h-12 w-full justify-center px-4 text-center"
        >
          Guías de talles
        </Link>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="field min-w-0 flex-1">
          <label htmlFor="search">Buscar producto</label>
          <input
            id="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Escribí el nombre…"
            autoComplete="off"
          />
        </div>
        <p className="shrink-0 pb-2 text-sm text-muted">
          {(catalog.data ?? []).length} producto{(catalog.data ?? []).length === 1 ? "" : "s"}
        </p>
      </div>

      {catalog.isLoading ? <p className="text-sm text-muted">Cargando catálogo…</p> : null}
      {catalog.isError ? <p className="text-sm text-danger">{errorMessage(catalog.error)}</p> : null}

      {!catalog.isLoading && filtered.length === 0 ? (
        <div className="rounded-[16px] border border-border bg-surface px-4 py-12 text-center">
          <p className="font-semibold">
            {q.trim() ? "No hay resultados" : "Catálogo vacío"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {q.trim()
              ? "Probá con otro nombre."
              : "Creá el primer producto para la tienda."}
          </p>
          {!q.trim() ? (
            <Link
              href="/admin/catalogo/nuevo"
              className="btn btn-primary mx-auto mt-5 max-w-[220px] !text-white"
              style={{ color: "#ffffff" }}
            >
              Nuevo producto
            </Link>
          ) : null}
        </div>
      ) : null}

      <ul className="space-y-3">
        {filtered.map((p) => {
          const stockTotal = (p.product_variants ?? []).reduce((n, v) => n + v.stock_on_hand, 0);
          const thumb = primaryProductImageUrl(p.product_images);
          return (
            <li key={p.id} className="rounded-[16px] border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-soft">
                    <ProductImage url={thumb} alt={p.name} className="h-full w-full" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/catalogo/${p.id}`}
                      className="font-semibold hover:text-accent"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatArsCents(p.promo_price_cents ?? p.list_price_cents)} ·{" "}
                      {stockTotal} en stock
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
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Stock por talle
                </p>
                {(p.product_variants ?? []).map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1 rounded-[10px] border border-border/70 bg-bg/40 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text">
                        {v.color} / {v.size}
                      </p>
                      {v.sku ? (
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                          Cód. {v.sku}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted">Sin código</p>
                      )}
                    </div>
                    <div className="flex flex-col items-stretch gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Stock
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="0"
                        aria-label={`Stock ${v.color} ${v.size}`}
                        className="h-10 w-full rounded-md border border-border bg-surface px-2 text-center"
                        defaultValue={v.stock_on_hand}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === "") {
                            e.target.value = String(v.stock_on_hand);
                            return;
                          }
                          const n = Number(raw);
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
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href={`/admin/catalogo/${p.id}`}
                className="mt-3 inline-block text-sm font-semibold text-accent"
              >
                Editar producto →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

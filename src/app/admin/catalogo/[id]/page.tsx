"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminProductImages } from "@/components/admin/product-images";
import { centsToPesosInput, pesosToCents, slugify, useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

type ProductImage = {
  id: string;
  storage_path: string;
  alt?: string | null;
  sort_order?: number;
  url?: string;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string;
  list_price_cents: number;
  promo_price_cents: number | null;
  is_published: boolean;
  size_guide_id?: string | null;
  updated_at?: string;
  product_variants: { id: string; color: string; size: string; stock_on_hand: number }[] | null;
  product_images?: ProductImage[] | null;
};

export default function AdminEditarProductoPage() {
  const token = useAdminToken();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const catalog = trpc.admin.catalog.listProducts.useQuery(undefined, { enabled: !!token });
  const product = useMemo(
    () => (catalog.data ?? []).find((p) => p.id === id) as ProductRow | undefined,
    [catalog.data, id],
  );

  if (catalog.isLoading) {
    return <p className="text-sm text-muted">Cargando producto…</p>;
  }

  if (!product) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">Producto no encontrado.</p>
        <Link href="/admin/catalogo" className="btn btn-secondary max-w-xs">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <EditForm
      key={`${product.id}:${product.updated_at ?? product.slug}`}
      product={product}
      images={product.product_images ?? []}
      onImagesChanged={() => catalog.refetch()}
    />
  );
}

function EditForm({
  product,
  images,
  onImagesChanged,
}: {
  product: ProductRow;
  images: ProductImage[];
  onImagesChanged: () => void | Promise<unknown>;
}) {
  const router = useRouter();
  const cats = trpc.catalog.listCategories.useQuery();
  const guides = trpc.admin.catalog.listSizeGuides.useQuery();
  const update = trpc.admin.catalog.updateProduct.useMutation();
  const setStock = trpc.admin.catalog.setVariantStock.useMutation();
  const setPublished = trpc.admin.catalog.setPublished.useMutation();
  const utils = trpc.useUtils();

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [description, setDescription] = useState(product.description ?? "");
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [sizeGuideId, setSizeGuideId] = useState(product.size_guide_id ?? "");
  const [listPrice, setListPrice] = useState(centsToPesosInput(product.list_price_cents));
  const [promoPrice, setPromoPrice] = useState(
    product.promo_price_cents != null ? centsToPesosInput(product.promo_price_cents) : "",
  );
  const [isPublished, setIsPublished] = useState(product.is_published);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const list = cats.data ?? [];
    const roots = list.filter((c) => !c.parent_id);
    const out: { id: string; label: string }[] = [];
    for (const r of roots) {
      const children = list
        .filter((c) => c.parent_id === r.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (children.length === 0) out.push({ id: r.id, label: r.name });
      else for (const ch of children) out.push({ id: ch.id, label: `${r.name} · ${ch.name}` });
    }
    return out;
  }, [cats.data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await update.mutateAsync({
        id: product.id,
        name: name.trim(),
        slug: slugify(slug.trim()),
        description: description.trim(),
        categoryId,
        listPriceCents: pesosToCents(listPrice),
        promoPriceCents: promoPrice.trim() ? pesosToCents(promoPrice) : null,
        isPublished,
        sizeGuideId: sizeGuideId ? sizeGuideId : null,
      });
      await utils.admin.catalog.listProducts.invalidate();
      setMsg("Guardado");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-4 pb-6">
      <button
        type="button"
        className="text-sm font-semibold text-accent"
        onClick={() => router.push("/admin/catalogo")}
      >
        ← Catálogo
      </button>

      <AdminProductImages
        productId={product.id}
        images={images}
        onChanged={async () => {
          await utils.admin.catalog.listProducts.invalidate();
          await onImagesChanged();
        }}
      />

      <div className="field">
        <label htmlFor="name">Nombre</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="field">
        <label htmlFor="slug">Slug</label>
        <input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="cat">Categoría</label>
        <select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="guide">Guía de talles</label>
        <select
          id="guide"
          value={sizeGuideId}
          onChange={(e) => setSizeGuideId(e.target.value)}
        >
          <option value="">Sin guía</option>
          {(guides.data ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Tablas seed: Magher mujer/hombre, Medias Sox (`public/size-guides/`).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="list">Precio lista ($)</label>
          <input id="list" value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="promo">Precio promo ($) opcional</label>
          <input id="promo" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="desc">Descripción</label>
        <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <label className="flex min-h-12 items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-3">
        <span className="text-sm font-semibold">Publicado en tienda</span>
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => {
            const next = e.target.checked;
            setIsPublished(next);
            setPublished.mutate(
              { id: product.id, isPublished: next },
              {
                onSuccess: () => utils.admin.catalog.listProducts.invalidate(),
                onError: (err) => setError(errorMessage(err)),
              },
            );
          }}
        />
      </label>

      <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
        <h2 className="font-bold">Stock por variante</h2>
        <p className="text-xs text-muted">
          Alta de variantes nuevas no está en API v1 (solo stock). Creá producto nuevo si falta
          color/talle.
        </p>
        {(product.product_variants ?? []).map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-28">
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
                    onSuccess: () => {
                      setMsg("Stock actualizado");
                      utils.admin.catalog.listProducts.invalidate();
                    },
                    onError: (err) => setError(errorMessage(err)),
                  },
                );
              }}
            />
            <span className="text-xs text-muted">on hand</span>
          </div>
        ))}
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {msg ? <p className="text-sm text-success">{msg}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={update.isPending}>
        {update.isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminMoneyField } from "@/components/admin/money-field";
import { AdminProductImages } from "@/components/admin/product-images";
import { slugify, useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { centsToPesosInput, pesosToCents } from "@/lib/format/money";
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
  product_variants:
    | { id: string; color: string; size: string; stock_on_hand: number; sku: string | null }[]
    | null;
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
  const updateVariant = trpc.admin.catalog.updateVariant.useMutation();
  const addVariant = trpc.admin.catalog.addVariant.useMutation();
  const removeVariant = trpc.admin.catalog.removeVariant.useMutation();
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
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newStock, setNewStock] = useState("0");
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
        <label htmlFor="slug">Enlace en la web</label>
        <input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          required
        />
        <p className="text-xs text-muted">
          Se arma solo desde el nombre. Aparece en la URL del producto (ej. /p/calza-negra).
        </p>
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
          Gestioná guías en{" "}
          <Link href="/admin/guias" className="font-semibold text-accent">
            Guías de talles
          </Link>
          . Seed: Magher / Medias en <code>public/size-guides/</code>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminMoneyField
          id="list"
          label="Precio lista"
          value={listPrice}
          onChange={setListPrice}
        />
        <AdminMoneyField
          id="promo"
          label="Precio promo (opcional)"
          value={promoPrice}
          onChange={setPromoPrice}
          optional
        />
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
        <h2 className="font-bold">Variantes y stock</h2>
        <p className="text-xs text-muted">
          Sumá color/talle acá. Si la variante ya salió en un pedido o tiene reserva, no se borra:
          poné stock 0.
        </p>
        {(product.product_variants ?? []).map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-28 font-medium">
              {v.color} / {v.size}
            </span>
            <input
              type="text"
              aria-label={`Código ${v.color} ${v.size}`}
              placeholder="Código"
              className="h-10 w-32 rounded-md border border-border px-2"
              defaultValue={v.sku ?? ""}
              onBlur={(e) => {
                const next = e.target.value.trim();
                const prev = (v.sku ?? "").trim();
                if (next === prev) return;
                setError(null);
                updateVariant.mutate(
                  { variantId: v.id, sku: next || null },
                  {
                    onSuccess: () => {
                      setMsg("Código actualizado");
                      utils.admin.catalog.listProducts.invalidate();
                    },
                    onError: (err) => setError(errorMessage(err)),
                  },
                );
              }}
            />
            <input
              type="number"
              min={0}
              aria-label={`Stock ${v.color} ${v.size}`}
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
            <span className="text-xs text-muted">unidades en stock</span>
            <button
              type="button"
              className="text-xs font-semibold text-danger underline-offset-2 hover:underline disabled:opacity-40"
              disabled={removeVariant.isPending}
              onClick={() => {
                if (!window.confirm(`¿Borrar variante ${v.color} / ${v.size}?`)) return;
                setError(null);
                removeVariant.mutate(
                  { variantId: v.id },
                  {
                    onSuccess: () => {
                      setMsg("Variante eliminada");
                      utils.admin.catalog.listProducts.invalidate();
                    },
                    onError: (err) => setError(errorMessage(err)),
                  },
                );
              }}
            >
              Borrar
            </button>
          </div>
        ))}

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-sm font-semibold">Agregar variante</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="field">
              <label htmlFor="nv-color">Color</label>
              <input
                id="nv-color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Negro"
              />
            </div>
            <div className="field">
              <label htmlFor="nv-size">Talle</label>
              <input
                id="nv-size"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="M"
              />
            </div>
            <div className="field">
              <label htmlFor="nv-sku">Código</label>
              <input
                id="nv-sku"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder="Excel"
              />
            </div>
            <div className="field">
              <label htmlFor="nv-stock">Stock</label>
              <input
                id="nv-stock"
                type="number"
                min={0}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={addVariant.isPending}
                onClick={() => {
                  setError(null);
                  const color = newColor.trim();
                  const size = newSize.trim();
                  if (!color || !size) {
                    setError("Color y talle son obligatorios");
                    return;
                  }
                  const stockOnHand = Math.max(0, Math.floor(Number(newStock)) || 0);
                  const sku = newSku.trim() || null;
                  addVariant.mutate(
                    { productId: product.id, color, size, stockOnHand, sku },
                    {
                      onSuccess: () => {
                        setNewColor("");
                        setNewSize("");
                        setNewSku("");
                        setNewStock("0");
                        setMsg("Variante agregada");
                        utils.admin.catalog.listProducts.invalidate();
                      },
                      onError: (err) => setError(errorMessage(err)),
                    },
                  );
                }}
              >
                {addVariant.isPending ? "…" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {msg ? <p className="text-sm text-success">{msg}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={update.isPending}>
        {update.isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

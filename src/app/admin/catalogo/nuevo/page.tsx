"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AdminMoneyField } from "@/components/admin/money-field";
import { slugify, useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { pesosToCents } from "@/lib/format/money";
import { trpc } from "@/lib/trpc/client";

type VariantDraft = {
  key: string;
  color: string;
  size: string;
  /** Draft string so the field can be cleared while typing (avoids stuck "0"). */
  stockOnHand: string;
  sku: string;
};

type PendingPhoto = {
  key: string;
  file: File;
  previewUrl: string;
};

function parseStockOnHand(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return String(Math.random());
}

function revokePreviews(photos: PendingPhoto[]) {
  for (const p of photos) {
    try {
      URL.revokeObjectURL(p.previewUrl);
    } catch {
      /* ignore */
    }
  }
}

export default function AdminNuevoProductoPage() {
  const token = useAdminToken();
  const router = useRouter();
  const cats = trpc.catalog.listCategories.useQuery(undefined, { enabled: !!token });
  const create = trpc.admin.catalog.createProduct.useMutation();
  const createUrl = trpc.admin.catalog.createImageUploadUrl.useMutation();
  const attach = trpc.admin.catalog.attachProductImage.useMutation();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [listPrice, setListPrice] = useState("0");
  const [promoPrice, setPromoPrice] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([
    { key: cryptoRandom(), color: "", size: "", stockOnHand: "", sku: "" },
  ]);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
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
      else {
        for (const ch of children) out.push({ id: ch.id, label: `${r.name} · ${ch.name}` });
      }
    }
    return out;
  }, [cats.data]);

  function addPhotoFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const next: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError(`Archivo no imagen: ${file.name}`);
        revokePreviews(next);
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError(`Máx 8MB: ${file.name}`);
        revokePreviews(next);
        return;
      }
      next.push({
        key: cryptoRandom(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setPhotos((prev) => [...prev, ...next]);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((p) => p.key !== key);
    });
  }

  async function uploadPendingPhotos(productId: string, queue: PendingPhoto[]) {
    for (const item of queue) {
      const up = await createUrl.mutateAsync({
        productId,
        fileName: item.file.name,
        contentType: item.file.type,
      });
      const put = await fetch(up.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": item.file.type || "application/octet-stream",
        },
        body: item.file,
      });
      if (!put.ok) {
        throw new Error(`No se pudo subir ${item.file.name} (${put.status})`);
      }
      await attach.mutateAsync({
        productId,
        storagePath: up.path,
        alt: item.file.name.replace(/\.[^.]+$/, ""),
      });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanVariants = variants
      .map((v) => ({
        color: v.color.trim(),
        size: v.size.trim(),
        stockOnHand: parseStockOnHand(v.stockOnHand),
        sku: v.sku.trim() || null,
      }))
      .filter((v) => v.color && v.size);

    if (!name.trim() || !slug.trim() || !categoryId) {
      setError("Completá nombre y categoría.");
      return;
    }
    if (cleanVariants.length === 0) {
      setError("Agregá al menos una variante (color + talle).");
      return;
    }

    setBusy(true);
    try {
      const product = await create.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        categoryId,
        listPriceCents: pesosToCents(listPrice),
        promoPriceCents: promoPrice.trim() ? pesosToCents(promoPrice) : null,
        isPublished,
        variants: cleanVariants,
      });

      const queue = photos;
      if (queue.length > 0) {
        try {
          await uploadPendingPhotos(product.id, queue);
        } catch (uploadErr) {
          // Product exists — send admin to editor to finish photos.
          setError(
            `${errorMessage(uploadErr, "Producto creado, pero falló una foto")}. Completá las fotos en el editor.`,
          );
          revokePreviews(queue);
          setPhotos([]);
          router.replace(`/admin/catalogo/${product.id}`);
          return;
        }
      }

      revokePreviews(queue);
      setPhotos([]);
      router.replace(`/admin/catalogo/${product.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const submitting = busy || create.isPending || createUrl.isPending || attach.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-6">
      <p className="text-sm text-muted">
        Alta: datos, variantes y fotos (podés sumar varias). Después seguís en el editor.
      </p>

      <div className="field">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          value={name}
          onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (!slugTouched) setSlug(slugify(v));
          }}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="slug">Enlace en la web</label>
        <input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          required
        />
        <p className="text-xs text-muted">
          Se completa solo al escribir el nombre. Es la URL del producto en la tienda.
        </p>
      </div>

      <div className="field">
        <label htmlFor="cat">Categoría</label>
        <select
          id="cat"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          <option value="">Elegir…</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
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

      <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Fotos</h2>
          <button
            type="button"
            className="btn btn-secondary w-auto px-4"
            disabled={submitting}
            onClick={() => photoInputRef.current?.click()}
          >
            + Agregar fotos
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addPhotoFiles(e.target.files)}
          />
        </div>
        <p className="text-xs text-muted">
          JPG/PNG/WebP · máx 8MB c/u. Varias fotos OK: en la ficha se ven en carrusel. La primera
          queda como portada (después se reordena en el editor).
        </p>
        {photos.length === 0 ? (
          <div className="grid place-items-center rounded-[12px] border border-dashed border-border bg-surface-soft px-4 py-10 text-sm text-muted">
            Todavía no hay fotos elegidas
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p, idx) => (
              <li key={p.key} className="relative overflow-hidden rounded-[12px] border border-border">
                <div className="aspect-square bg-surface-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt={p.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                {idx === 0 ? (
                  <span className="absolute left-1 top-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-inverse">
                    Portada
                  </span>
                ) : null}
                <button
                  type="button"
                  className="absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"
                  disabled={submitting}
                  onClick={() => removePhoto(p.key)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Variantes</h2>
          <button
            type="button"
            className="btn btn-ghost w-auto px-3 text-sm"
            onClick={() =>
              setVariants((vs) => [
                ...vs,
                { key: cryptoRandom(), color: "", size: "", stockOnHand: "", sku: "" },
              ])
            }
          >
            + Variante
          </button>
        </div>
        {variants.map((v, idx) => (
          <div
            key={v.key}
            className="grid gap-3 rounded-[12px] border border-border bg-bg/50 p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="field min-w-0">
              <label htmlFor={`nv-color-${v.key}`}>Color</label>
              <input
                id={`nv-color-${v.key}`}
                placeholder="Negro"
                value={v.color}
                onChange={(e) =>
                  setVariants((vs) =>
                    vs.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)),
                  )
                }
              />
            </div>
            <div className="field min-w-0">
              <label htmlFor={`nv-size-${v.key}`}>Talle</label>
              <input
                id={`nv-size-${v.key}`}
                placeholder="M"
                value={v.size}
                onChange={(e) =>
                  setVariants((vs) =>
                    vs.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)),
                  )
                }
              />
            </div>
            <div className="field min-w-0">
              <label htmlFor={`nv-sku-${v.key}`}>Código</label>
              <input
                id={`nv-sku-${v.key}`}
                placeholder="Excel / SKU"
                value={v.sku}
                onChange={(e) =>
                  setVariants((vs) =>
                    vs.map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x)),
                  )
                }
              />
            </div>
            <div className="field min-w-0">
              <label htmlFor={`nv-stock-${v.key}`}>Stock</label>
              <input
                id={`nv-stock-${v.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="0"
                value={v.stockOnHand}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next !== "" && Number(next) < 0) return;
                  setVariants((vs) =>
                    vs.map((x, i) => (i === idx ? { ...x, stockOnHand: next } : x)),
                  );
                }}
              />
            </div>
          </div>
        ))}
      </section>

      <label className="flex min-h-12 items-center gap-3 rounded-[12px] border border-border bg-surface px-3">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        <span className="text-sm font-semibold">Publicar en tienda</span>
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting
          ? photos.length
            ? "Creando y subiendo fotos…"
            : "Creando…"
          : photos.length
            ? `Crear producto (${photos.length} foto${photos.length === 1 ? "" : "s"})`
            : "Crear producto"}
      </button>
    </form>
  );
}

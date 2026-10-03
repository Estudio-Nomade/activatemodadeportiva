"use client";

import { useRef, useState } from "react";
import { ProductImage } from "@/components/store/product-image";
import { moveIdInOrder } from "@/lib/catalog/reorder-ids";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

type Img = {
  id: string;
  storage_path: string;
  alt?: string | null;
  sort_order?: number;
  url?: string;
};

type Props = {
  productId: string;
  images: Img[];
  onChanged: () => void | Promise<unknown>;
};

export function AdminProductImages({ productId, images, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const createUrl = trpc.admin.catalog.createImageUploadUrl.useMutation();
  const attach = trpc.admin.catalog.attachProductImage.useMutation();
  const remove = trpc.admin.catalog.removeProductImage.useMutation();
  const reorder = trpc.admin.catalog.reorderProductImages.useMutation();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`Archivo no imagen: ${file.name}`);
        }
        if (file.size > 8 * 1024 * 1024) {
          throw new Error(`Máx 8MB: ${file.name}`);
        }
        const up = await createUrl.mutateAsync({
          productId,
          fileName: file.name,
          contentType: file.type,
        });
        const put = await fetch(up.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });
        if (!put.ok) {
          throw new Error(`No se pudo subir ${file.name} (${put.status})`);
        }
        await attach.mutateAsync({
          productId,
          storagePath: up.path,
          alt: file.name.replace(/\.[^.]+$/, ""),
        });
      }
      setMsg(files.length > 1 ? `${files.length} fotos subidas` : "Foto subida");
      await onChanged();
    } catch (e) {
      setErr(errorMessage(e, "Error al subir"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove(imageId: string) {
    if (!window.confirm("¿Quitar esta foto?")) return;
    setBusy(true);
    setErr(null);
    try {
      await remove.mutateAsync({ imageId });
      setMsg("Foto eliminada");
      await onChanged();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onMove(imageId: string, direction: "up" | "down") {
    const ids = sorted.map((img) => img.id);
    const next = moveIdInOrder(ids, imageId, direction);
    if (next === ids || next.every((id, i) => id === ids[i])) return;
    setBusy(true);
    setErr(null);
    try {
      await reorder.mutateAsync({ productId, orderedIds: next });
      setMsg(direction === "up" ? "Movida hacia portada" : "Orden actualizado");
      await onChanged();
    } catch (e) {
      setErr(errorMessage(e, "No se pudo reordenar"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Fotos</h2>
        <button
          type="button"
          className="btn btn-secondary w-auto px-4"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Subiendo…" : "+ Subir"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
      </div>

      <p className="text-xs text-muted">
        JPG/PNG/WebP · máx 8MB. Ideal: cuadrado 1:1 ~1200×1200 px. Otras medidas también se
        suben; en catálogo y ficha se recortan al centro para llenar el marco. La primera
        (Portada) sale en cards y PDP. Usá ↑↓ para reordenar.
      </p>

      {sorted.length === 0 ? (
        <div className="grid place-items-center rounded-[12px] border border-dashed border-border bg-surface-soft px-4 py-10 text-sm text-muted">
          Todavía no hay fotos
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {sorted.map((img, idx) => (
            <li key={img.id} className="relative overflow-hidden rounded-[12px] border border-border">
              <div className="aspect-square bg-surface-soft">
                <ProductImage
                  url={img.url}
                  path={img.storage_path}
                  alt={img.alt || `Foto ${idx + 1}`}
                  className="h-full w-full"
                />
              </div>
              {idx === 0 ? (
                <span className="absolute left-1 top-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-inverse">
                  Portada
                </span>
              ) : null}
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-xs font-bold text-white disabled:opacity-30"
                    disabled={busy || idx === 0}
                    aria-label="Subir en el orden"
                    onClick={() => void onMove(img.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-xs font-bold text-white disabled:opacity-30"
                    disabled={busy || idx === sorted.length - 1}
                    aria-label="Bajar en el orden"
                    onClick={() => void onMove(img.id, "down")}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
                  disabled={busy}
                  onClick={() => void onRemove(img.id)}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {msg ? <p className="text-sm text-success">{msg}</p> : null}
    </section>
  );
}

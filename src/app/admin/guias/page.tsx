"use client";

import { useRef, useState } from "react";
import { useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

export default function AdminGuiasPage() {
  const token = useAdminToken();
  const list = trpc.admin.catalog.listSizeGuides.useQuery(undefined, { enabled: !!token });
  const create = trpc.admin.catalog.createSizeGuide.useMutation();
  const update = trpc.admin.catalog.updateSizeGuide.useMutation();
  const remove = trpc.admin.catalog.deleteSizeGuide.useMutation();
  const uploadUrl = trpc.admin.catalog.createSizeGuideUploadUrl.useMutation();
  const utils = trpc.useUtils();

  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function refresh() {
    await utils.admin.catalog.listSizeGuides.invalidate();
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const n = name.trim();
    if (!n) {
      setErr("Nombre requerido");
      return;
    }
    setBusy(true);
    try {
      await create.mutateAsync({ name: n });
      setName("");
      setMsg("Guía creada — subí la imagen con el botón de cada fila");
      await refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(guideId: string, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Solo imágenes");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Máx 8MB");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const up = await uploadUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type,
      });
      const put = await fetch(up.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload falló (${put.status})`);
      await update.mutateAsync({ id: guideId, storagePath: up.path });
      setMsg("Imagen actualizada");
      await refresh();
    } catch (e) {
      setErr(errorMessage(e, "Error al subir imagen"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <p className="text-sm text-muted">
        Guías mostradas en PDP. Seed: Magher / Medias en <code>public/size-guides/</code>. Podés
        crear nuevas y subir imagen al bucket <code>size-guides</code>.
      </p>

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2 rounded-[16px] border border-border bg-surface p-4">
        <div className="field min-w-[200px] flex-1">
          <label htmlFor="guide-name">Nueva guía</label>
          <input
            id="guide-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Magher unisex"
          />
        </div>
        <button type="submit" className="btn btn-primary w-auto px-5" disabled={busy || create.isPending}>
          Crear
        </button>
      </form>

      {list.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
      {list.isError ? <p className="text-sm text-danger">{errorMessage(list.error)}</p> : null}

      <ul className="space-y-3">
        {(list.data ?? []).map((g) => (
          <li
            key={g.id}
            className="space-y-3 rounded-[16px] border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editingId === g.id ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="min-h-11 flex-1 rounded-[12px] border border-border px-3"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary w-auto px-3"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        setErr(null);
                        update.mutate(
                          { id: g.id, name: editName },
                          {
                            onSuccess: async () => {
                              setEditingId(null);
                              setMsg("Nombre guardado");
                              await refresh();
                              setBusy(false);
                            },
                            onError: (e) => {
                              setErr(errorMessage(e));
                              setBusy(false);
                            },
                          },
                        );
                      }}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost w-auto px-3"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="font-bold">{g.name}</p>
                    <p className="mt-1 break-all text-xs text-muted">
                      {g.storage_path ?? "Sin imagen"}
                    </p>
                  </>
                )}
              </div>
              {g.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.url}
                  alt={g.name}
                  className="h-20 w-20 shrink-0 rounded-[12px] border border-border object-cover"
                />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[12px] border border-dashed border-border text-[10px] text-muted">
                  Sin img
                </div>
              )}
            </div>

            {editingId !== g.id ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary w-auto px-3 text-sm"
                  disabled={busy}
                  onClick={() => {
                    setEditingId(g.id);
                    setEditName(g.name);
                  }}
                >
                  Renombrar
                </button>
                <label className="btn btn-secondary w-auto cursor-pointer px-3 text-sm">
                  {busy ? "…" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => void onUpload(g.id, e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost w-auto px-3 text-sm text-danger"
                  disabled={busy || remove.isPending}
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar guía “${g.name}”? Los productos quedarán sin guía.`))
                      return;
                    setBusy(true);
                    setErr(null);
                    remove.mutate(
                      { id: g.id },
                      {
                        onSuccess: async () => {
                          setMsg("Guía eliminada");
                          await refresh();
                          setBusy(false);
                        },
                        onError: (e) => {
                          setErr(errorMessage(e));
                          setBusy(false);
                        },
                      },
                    );
                  }}
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {msg ? <p className="text-sm text-success">{msg}</p> : null}
    </div>
  );
}

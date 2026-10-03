"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

/** Match cloud bucket `file_size_limit` (5 MiB). */
const MAX_GUIDE_BYTES = 5 * 1024 * 1024;

function guideUploadError(err: unknown, fallback: string): string {
  const raw = errorMessage(err, fallback);
  const lower = raw.toLowerCase();
  if (lower.includes("unauthorized") || lower.includes("forbidden")) {
    return "Sesión admin inválida o vencida. Volvé a entrar en /admin/login e intentá de nuevo.";
  }
  if (lower.includes("bucket") && lower.includes("size-guides")) {
    return raw;
  }
  if (lower.includes("bucket") || lower.includes("not found")) {
    return `No se pudo usar el bucket size-guides. ${raw}`;
  }
  return raw;
}

export default function AdminGuiasPage() {
  const token = useAdminToken();
  const list = trpc.admin.catalog.listSizeGuides.useQuery(undefined, { enabled: !!token });
  const create = trpc.admin.catalog.createSizeGuide.useMutation();
  const update = trpc.admin.catalog.updateSizeGuide.useMutation();
  const remove = trpc.admin.catalog.deleteSizeGuide.useMutation();
  const uploadUrl = trpc.admin.catalog.createSizeGuideUploadUrl.useMutation();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
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
      setErr(guideUploadError(e, "No se pudo crear la guía"));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(guideId: string, file: File | null) {
    if (!file) return;
    if (!token) {
      setErr("No hay sesión admin. Entrá en /admin/login.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErr("Solo JPEG, PNG, WebP o GIF");
      return;
    }
    if (file.size > MAX_GUIDE_BYTES) {
      setErr("Máx 5MB por imagen (límite del bucket size-guides)");
      return;
    }
    setBusy(true);
    setUploadingId(guideId);
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
      if (!put.ok) {
        const body = (await put.text().catch(() => "")).slice(0, 180);
        throw new Error(
          `Upload falló (HTTP ${put.status})${body ? `: ${body}` : ""}. Revisá tamaño ≤5MB y tipo image/*.`,
        );
      }
      await update.mutateAsync({ id: guideId, storagePath: up.path });
      setMsg("Imagen actualizada — preview a la derecha");
      await refresh();
    } catch (e) {
      setErr(guideUploadError(e, "Error al subir imagen"));
    } finally {
      setBusy(false);
      setUploadingId(null);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <p className="text-sm text-muted">
        Tablas de talles del PDP. Seed local: <code>public/size-guides/</code>. Uploads nuevos van al
        bucket <code>size-guides</code> (JPEG/PNG/WebP, máx 5MB).
      </p>

      {err ? (
        <p className="rounded-[12px] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-[12px] border border-border bg-surface-soft px-3 py-2 text-sm text-success">
          {msg}
        </p>
      ) : null}

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2 rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5">
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
      {list.isError ? (
        <p className="text-sm text-danger" role="alert">
          {guideUploadError(list.error, "No se pudieron listar las guías")}
          {" · "}
          <Link href="/admin/login" className="font-semibold underline">
            Re-login
          </Link>
        </p>
      ) : null}

      <ul className="space-y-3">
        {(list.data ?? []).map((g) => (
          <li
            key={g.id}
            className="space-y-3 rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5"
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
                              setErr(guideUploadError(e, "No se pudo renombrar"));
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
                <label
                  className={`btn btn-secondary w-auto cursor-pointer px-3 text-sm ${busy ? "pointer-events-none opacity-60" : ""}`}
                >
                  {uploadingId === g.id ? "Subiendo…" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      void onUpload(g.id, f);
                    }}
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
                          setErr(guideUploadError(e, "No se pudo eliminar"));
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
    </div>
  );
}

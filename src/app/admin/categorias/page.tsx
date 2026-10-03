"use client";

import { useMemo, useState } from "react";
import { useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

const PLACEHOLDER =
  "Ej.: 80% poliéster, 20% elastano. Lavar con agua fría, no usar blanqueador, secar a la sombra.";

export default function AdminCategoriasPage() {
  const token = useAdminToken();
  const list = trpc.admin.catalog.listCategoriesForCare.useQuery(undefined, {
    enabled: !!token,
  });
  const update = trpc.admin.catalog.updateCategoryCompositionCare.useMutation();
  const utils = trpc.useUtils();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const groups = useMemo(() => {
    const rows = list.data ?? [];
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.parentName ?? "Sin padre";
      const bucket = map.get(key) ?? [];
      bucket.push(row);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [list.data]);

  function startEdit(id: string, text: string) {
    setEditingId(id);
    setDraft(text);
    setMsg(null);
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setErr(null);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setErr(null);
    setMsg(null);
    try {
      await update.mutateAsync({
        id: editingId,
        compositionCareText: draft,
      });
      setMsg("Guardado");
      setEditingId(null);
      setDraft("");
      await utils.admin.catalog.listCategoriesForCare.invalidate();
    } catch (e) {
      setErr(errorMessage(e, "No se pudo guardar"));
    }
  }

  if (!token) {
    return <p className="text-sm text-muted">Redirigiendo…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Composición y cuidados</p>
        <p className="mt-1 text-sm text-muted">
          Por categoría hoja. Se muestra en el acordeón del PDP. Vacío = se oculta la sección.
        </p>
      </div>

      {msg ? (
        <p className="rounded-[10px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      {list.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
      {list.isError ? (
        <p className="text-sm text-danger">{errorMessage(list.error, "Error al cargar")}</p>
      ) : null}

      <div className="space-y-8">
        {groups.map(([parentName, leaves]) => (
          <section key={parentName}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
              {parentName}
            </h2>
            <ul className="divide-y divide-border rounded-[12px] border border-border bg-surface">
              {leaves.map((leaf) => {
                const isEditing = editingId === leaf.id;
                const preview = leaf.composition_care_text.trim();
                return (
                  <li key={leaf.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text">{leaf.name}</p>
                        <p className="text-xs text-muted">{leaf.slug}</p>
                        {!isEditing ? (
                          <p className="mt-2 text-sm text-muted">
                            {preview
                              ? preview.length > 120
                                ? `${preview.slice(0, 120)}…`
                                : preview
                              : "Sin texto (sección oculta en PDP)"}
                          </p>
                        ) : null}
                      </div>
                      {!isEditing ? (
                        <button
                          type="button"
                          className="btn btn-secondary max-w-[120px] text-sm"
                          onClick={() => startEdit(leaf.id, leaf.composition_care_text)}
                        >
                          Editar
                        </button>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <form onSubmit={onSave} className="mt-3 space-y-3">
                        <label className="block text-sm font-semibold text-text" htmlFor={`care-${leaf.id}`}>
                          Composición y cuidados
                        </label>
                        <textarea
                          id={`care-${leaf.id}`}
                          className="min-h-[160px] w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder={PLACEHOLDER}
                          maxLength={20_000}
                        />
                        <p className="text-xs text-muted">
                          Texto plano. Saltos de línea se respetan en la tienda.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="btn btn-primary max-w-[140px] text-sm"
                            disabled={update.isPending}
                          >
                            {update.isPending ? "Guardando…" : "Guardar"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost max-w-[120px] text-sm"
                            onClick={cancelEdit}
                            disabled={update.isPending}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {!list.isLoading && groups.length === 0 ? (
        <p className="text-sm text-muted">No hay categorías hoja.</p>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  imageUrl: string | null;
  onClose: () => void;
};

/** Pencil 13 — bottom sheet guía de talles */
export function SizeGuideSheet({ open, title, imageUrl, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border border-border bg-surface shadow-xl sm:rounded-[20px]">
        <div className="flex items-center justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Guía de talles</p>
            <h2 className="truncate text-lg font-bold">{title}</h2>
          </div>
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full border border-border text-lg"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-soft p-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="mx-auto h-auto w-full max-w-full rounded-[12px] object-contain"
            />
          ) : (
            <p className="p-6 text-center text-sm text-muted">No hay imagen de guía cargada.</p>
          )}
        </div>
        <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { IconClose } from "@/components/store/icons";

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal
      aria-label="Guía de talles"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#12100f99]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-surface shadow-xl sm:rounded-[20px]">
        <div className="flex items-center justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text">Guía de talles</h2>
            <p className="mt-0.5 truncate text-[13px] text-muted">{title}</p>
          </div>
          <button
            type="button"
            className="grid h-12 w-12 shrink-0 place-items-center text-text"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <IconClose />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
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
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Medidas en cm. Si dudás entre dos talles, andá al más grande.
          </p>
        </div>
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

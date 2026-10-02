"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { IconClose, IconSearch } from "@/components/store/icons";
import { ProductImage } from "@/components/store/product-image";
import { formatArsCents, unitPriceCents } from "@/lib/format/money";
import { primaryProductImageUrl } from "@/lib/media/product-image";
import { trpc } from "@/lib/trpc/client";

const DEBOUNCE_MS = 250;
const PANEL_LIMIT = 6;

export function buildSearchHref(q: string): string {
  const trimmed = q.trim();
  return trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : "/buscar";
}

type HeaderSearchProps = {
  /** Desktop expands inline; mobile navigates to /buscar */
  variant: "desktop" | "mobile";
};

export function HeaderSearch({ variant }: HeaderSearchProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setDebounced(q.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setDebounced("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open || variant !== "desktop") return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, variant, close]);

  const results = trpc.catalog.search.useQuery(
    { q: debounced },
    { enabled: variant === "desktop" && open && debounced.length >= 1 },
  );

  function openSearch() {
    if (variant === "mobile") {
      router.push("/buscar");
      return;
    }
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const href = buildSearchHref(q);
    if (href === "/buscar" && !q.trim()) return;
    close();
    router.push(href);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (variant === "mobile") {
    return (
      <button
        type="button"
        ref={triggerRef}
        className="grid h-11 w-11 place-items-center text-text"
        aria-label="Buscar"
        onClick={openSearch}
      >
        <IconSearch />
      </button>
    );
  }

  const showPanel = open && debounced.length >= 1;
  const items = (results.data ?? []).slice(0, PANEL_LIMIT);
  const total = results.data?.length ?? 0;

  return (
    <div ref={rootRef} className="header-search relative flex items-center">
      <div
        className={`header-search__field overflow-hidden transition-[max-width,opacity] duration-200 ease-out ${
          open ? "header-search__field--open max-w-[280px] opacity-100" : "max-w-0 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <form
          className="flex h-10 w-[min(280px,28vw)] items-center gap-1 rounded-full border border-border bg-surface pl-3 pr-1"
          onSubmit={onSubmit}
          role="search"
        >
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar productos…"
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
            autoComplete="off"
            aria-label="Buscar productos"
            aria-controls={showPanel ? listId : undefined}
            tabIndex={open ? 0 : -1}
          />
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-text"
            aria-label="Cerrar búsqueda"
            onClick={close}
            tabIndex={open ? 0 : -1}
          >
            <IconClose size={16} />
          </button>
        </form>
      </div>

      <button
        type="button"
        ref={triggerRef}
        className={`grid h-10 place-items-center text-text hover:text-accent transition-[width,opacity] duration-200 ${
          open ? "pointer-events-none w-0 overflow-hidden opacity-0" : "w-10 opacity-100"
        }`}
        aria-label="Buscar"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={openSearch}
        tabIndex={open ? -1 : 0}
      >
        <IconSearch />
      </button>

      {showPanel ? (
        <div
          id={listId}
          className="header-search__panel absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[12px] border border-border bg-surface shadow-lg"
        >
          {results.isLoading ? (
            <p className="px-4 py-3 text-sm text-muted">Buscando…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">
              No hay resultados para “{debounced}”.
            </p>
          ) : (
            <ul className="max-h-[min(360px,50vh)] overflow-y-auto py-1">
              {items.map((p) => {
                const price = unitPriceCents(p);
                const imgUrl = primaryProductImageUrl(p.product_images);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/p/${p.slug}`}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-soft"
                      onClick={close}
                    >
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md bg-surface-soft">
                        <ProductImage
                          url={imgUrl}
                          alt={p.name}
                          className="h-full w-full"
                          imgClassName="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">{p.name}</p>
                        <p className="text-xs font-bold text-text">{formatArsCents(price)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {total > 0 ? (
            <Link
              href={buildSearchHref(debounced)}
              className="block border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-accent hover:bg-surface-soft"
              onClick={close}
            >
              {total > PANEL_LIMIT ? `Ver todos (${total})` : "Ver todos"}
            </Link>
          ) : debounced && !results.isLoading ? (
            <Link
              href={buildSearchHref(debounced)}
              className="block border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-accent hover:bg-surface-soft"
              onClick={close}
            >
              Buscar “{debounced}”
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

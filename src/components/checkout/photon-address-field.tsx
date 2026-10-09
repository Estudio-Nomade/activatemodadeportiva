"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchPhotonAddresses, type PhotonAddress } from "@/lib/photon/client";

type Props = {
  value: string;
  onQueryChange: (q: string) => void;
  onSelect: (addr: PhotonAddress) => void;
  disabled?: boolean;
  error?: string | null;
  inputId?: string;
  label?: string;
};

type SearchState =
  | { status: "idle" }
  | { status: "short" }
  | { status: "loading" }
  | { status: "ok"; results: PhotonAddress[] }
  | { status: "empty" }
  | { status: "error"; message: string };

export function PhotonAddressField({
  value,
  onQueryChange,
  onSelect,
  disabled,
  error,
  inputId,
  label = "Buscar dirección",
}: Props) {
  const autoId = useId();
  const id = inputId ?? autoId;
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  const q = value.trim();
  const tooShort = q.length > 0 && q.length < 3;

  useEffect(() => {
    if (q.length < 3) {
      // defer to avoid sync setState-in-effect lint: schedule microtask
      const t = window.setTimeout(() => {
        setSearch(q.length === 0 ? { status: "idle" } : { status: "short" });
        setActiveIdx(-1);
      }, 0);
      return () => window.clearTimeout(t);
    }

    const myId = ++reqId.current;
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      setSearch({ status: "loading" });
      searchPhotonAddresses(q, { signal: ac.signal })
        .then((rows) => {
          if (myId !== reqId.current) return;
          if (rows.length === 0) {
            setSearch({ status: "empty" });
            setActiveIdx(-1);
          } else {
            setSearch({ status: "ok", results: rows });
            setOpen(true);
            setActiveIdx(0);
          }
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === "AbortError") return;
          if (myId !== reqId.current) return;
          setSearch({
            status: "error",
            message: "No se pudo buscar. Completá la dirección a mano.",
          });
          setActiveIdx(-1);
        });
    }, 300);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = search.status === "ok" ? search.results : [];

  function choose(addr: PhotonAddress) {
    onSelect(addr);
    setOpen(false);
    setSearch({ status: "idle" });
    setActiveIdx(-1);
  }

  let hint: string | null = null;
  if (search.status === "short" || tooShort) hint = "Escribí al menos 3 caracteres";
  if (search.status === "empty")
    hint = "Sin resultados — probá otra escritura o completá a mano abajo";
  if (search.status === "error") hint = search.message;

  return (
    <div ref={rootRef} className="relative space-y-1">
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined}
          autoComplete="street-address"
          disabled={disabled}
          value={value}
          placeholder="Ej: Florida 100, Buenos Aires"
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => (i + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
            } else if (e.key === "Enter" && activeIdx >= 0) {
              e.preventDefault();
              choose(results[activeIdx]!);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={error ? "border-danger" : undefined}
        />
      </div>

      {search.status === "loading" ? <p className="text-xs text-muted">Buscando…</p> : null}
      {hint && search.status !== "loading" ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[12px] border border-border bg-surface py-1 shadow-lg"
        >
          {results.map((r, idx) => (
            <li
              key={`${r.label}-${idx}`}
              role="option"
              aria-selected={idx === activeIdx}
              id={`${listId}-opt-${idx}`}
            >
              <button
                type="button"
                className={`w-full px-3 py-3 text-left text-sm ${
                  idx === activeIdx ? "bg-accent-soft text-accent" : "hover:bg-surface-soft"
                }`}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => choose(r)}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

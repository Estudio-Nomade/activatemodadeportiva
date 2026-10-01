"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  color: string;
  size: string;
  unitPriceCents: number;
  qty: number;
  imagePath?: string | null;
  maxAvailable: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  addLine: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (variantId: string, qty: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "activate_cart_v1";
const EMPTY: CartLine[] = [];
const CartContext = createContext<CartContextValue | null>(null);

let memoryLines: CartLine[] = EMPTY;
const listeners = new Set<() => void>();

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return memoryLines;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(next: CartLine[]) {
  memoryLines = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  memoryLines = readStorage();
  return memoryLines;
}

function getServerSnapshot() {
  return EMPTY;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addLine = useCallback((input: Omit<CartLine, "qty"> & { qty?: number }) => {
    const qty = Math.max(1, input.qty ?? 1);
    const prev = readStorage();
    const existing = prev.find((l) => l.variantId === input.variantId);
    if (existing) {
      const nextQty = Math.min(existing.maxAvailable, existing.qty + qty);
      writeStorage(
        prev.map((l) =>
          l.variantId === input.variantId
            ? { ...l, ...input, qty: nextQty, maxAvailable: input.maxAvailable }
            : l,
        ),
      );
      return;
    }
    writeStorage([
      ...prev,
      { ...input, qty: Math.min(input.maxAvailable, qty) },
    ]);
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    writeStorage(
      readStorage()
        .map((l) => {
          if (l.variantId !== variantId) return l;
          return { ...l, qty: Math.min(l.maxAvailable, Math.max(0, Math.floor(qty))) };
        })
        .filter((l) => l.qty > 0),
    );
  }, []);

  const removeLine = useCallback((variantId: string) => {
    writeStorage(readStorage().filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => writeStorage(EMPTY), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      addLine,
      setQty,
      removeLine,
      clear,
    }),
    [lines, addLine, setQty, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

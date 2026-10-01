"use client";

import { useSyncExternalStore } from "react";
import { getAdminAccessToken, setAdminAccessToken } from "@/lib/trpc/provider";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const TOKEN_EVENT = "activate-admin-token";

export function notifyAdminTokenChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function useAdminToken() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener(TOKEN_EVENT, handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(TOKEN_EVENT, handler);
      };
    },
    () => getAdminAccessToken(),
    () => null,
  );
}

export async function adminLogin(email: string, password: string) {
  const sb = createBrowserSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(error?.message ?? "No se pudo iniciar sesión");
  }
  setAdminAccessToken(data.session.access_token);
  notifyAdminTokenChange();
  return data.session.access_token;
}

export async function adminLogout() {
  setAdminAccessToken(null);
  notifyAdminTokenChange();
  try {
    await createBrowserSupabase().auth.signOut();
  } catch {
    /* ignore */
  }
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_confirmado: "Pago confirmado",
  preparando: "Preparando",
  listo_retiro: "Listo retiro",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const PENDING_STATUSES = ["pendiente_pago"] as const;
export const IN_PROGRESS_STATUSES = [
  "pago_confirmado",
  "preparando",
  "listo_retiro",
  "enviado",
] as const;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function pesosToCents(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToPesosInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

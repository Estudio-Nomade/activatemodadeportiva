"use client";

import { useEffect, useSyncExternalStore } from "react";
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

/** True when JWT `exp` is in the past (or unreadable). */
export function isAccessTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (typeof json.exp !== "number") return true;
    // 30s skew
    return json.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

/**
 * Keep `activate_admin_access_token` in sync with Supabase Auth session.
 * Fixes UNAUTHORIZED on admin.* when localStorage still has a stale JWT
 * (shell only checked token presence, not expiry/refresh).
 */
export async function syncAdminSessionFromSupabase(): Promise<string | null> {
  const sb = createBrowserSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) {
    setAdminAccessToken(null);
    notifyAdminTokenChange();
    return null;
  }
  const access = data.session?.access_token ?? null;
  if (!access || isAccessTokenExpired(access)) {
    // try refresh once if session object exists but access looks dead
    if (data.session?.refresh_token) {
      const refreshed = await sb.auth.refreshSession();
      const next = refreshed.data.session?.access_token ?? null;
      if (next && !isAccessTokenExpired(next)) {
        setAdminAccessToken(next);
        notifyAdminTokenChange();
        return next;
      }
    }
    setAdminAccessToken(null);
    notifyAdminTokenChange();
    return null;
  }
  if (getAdminAccessToken() !== access) {
    setAdminAccessToken(access);
    notifyAdminTokenChange();
  }
  return access;
}

/** Subscribe once per app shell — refresh token into localStorage for tRPC Bearer. */
export function useAdminSessionSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      // Drop obviously expired cached JWT before first admin query fires
      const cached = getAdminAccessToken();
      if (cached && isAccessTokenExpired(cached)) {
        setAdminAccessToken(null);
        notifyAdminTokenChange();
      }
      if (cancelled) return;
      await syncAdminSessionFromSupabase();
      if (cancelled) return;

      const sb = createBrowserSupabase();
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          setAdminAccessToken(null);
          notifyAdminTokenChange();
          return;
        }
        const access = session?.access_token ?? null;
        if (access) {
          setAdminAccessToken(access);
          notifyAdminTokenChange();
        }
      });
      unsub = () => data.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [enabled]);
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

/** @deprecated import from `@/lib/format/money` — kept for existing admin pages */
export { pesosToCents, centsToPesosInput } from "@/lib/format/money";

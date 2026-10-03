"use client";

import { useEffect } from "react";

/**
 * PWA service worker registration.
 * In development: always unregister + wipe caches so HMR / Turbopack
 * never fights a stale cache-first shell (classic hydration MUJER↔Mujer).
 * In production: register /sw.js once.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isDev = process.env.NODE_ENV === "development";

    async function wipeDevServiceWorkers() {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        /* private mode / unsupported */
      }
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
    }

    if (isDev) {
      void wipeDevServiceWorkers();
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* ignore registration failures (private mode, etc.) */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  return null;
}

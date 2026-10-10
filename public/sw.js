/* Activate PWA service worker — lightweight offline shell + static cache */
const CACHE = "activate-pwa-v20-admin-push";
const PRECACHE = [
  "/",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/brand/logo.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Next runtime / HMR / RSC / API / admin
  // (cache-first on /_next/static causes SSR↔client text mismatches in dev
  // and stale bundles after deploys if filenames collide.)
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("trpc") ||
    url.pathname.startsWith("/admin")
  ) {
    return;
  }

  // Navigations: network-first, fallback cache home
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("/") || Response.error();
        }),
    );
    return;
  }

  // Never cache CSS long-term with stale brand tokens (dev + deploy)
  if (url.pathname.endsWith(".css") || url.pathname.includes("globals")) {
    return;
  }

  // Brand / icons only: cache-first (not Next bundles)
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        });
      }),
    );
  }
});

/** Same-origin admin path only (mirrors server assertAdminDeepLink). */
function safeAdminPath(raw) {
  if (typeof raw !== "string") return "/admin";
  if (raw.includes("://") || raw.startsWith("//") || raw.includes("..")) return "/admin";
  if (raw !== "/admin" && !raw.startsWith("/admin/")) return "/admin";
  try {
    const u = new URL(raw, self.location.origin);
    if (u.origin !== self.location.origin) return "/admin";
    if (u.pathname !== "/admin" && !u.pathname.startsWith("/admin/")) return "/admin";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/admin";
  }
}

self.addEventListener("push", (event) => {
  let data = { title: "Activate Admin", body: "", url: "/admin", tag: "admin" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }
  const url = safeAdminPath(data.url);
  event.waitUntil(
    self.registration.showNotification(data.title || "Activate Admin", {
      body: data.body || "",
      tag: data.tag || "admin",
      data: { url },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safeAdminPath(event.notification.data && event.notification.data.url);
  const targetUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const adminClient = all.find((c) => {
        try {
          const p = new URL(c.url).pathname;
          return p === "/admin" || p.startsWith("/admin/");
        } catch {
          return false;
        }
      });
      const client = adminClient || all[0];
      if (client && "focus" in client) {
        await client.focus();
        if ("navigate" in client) {
          try {
            await client.navigate(targetUrl);
          } catch {
            /* ignore */
          }
        }
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

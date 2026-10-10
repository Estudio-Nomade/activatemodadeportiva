# Admin Web Push + Admin-only PWA — Design

**Date:** 2026-10-09  
**Status:** Draft for user review  
**Scope:** Admin push notifications (Web Push / VAPID) and a dedicated admin PWA install surface  
**Product source of truth:** `docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`  
**Related:** PWA baseline (`public/sw.js`, `src/app/manifest.ts`, `src/components/pwa/register-sw.tsx`), email port pattern (`src/server/email/port.ts`)  
**Language of this document:** English  
**Admin UI copy language:** Spanish (Argentina)  
**Implementation workspace:** git worktree (not the primary working tree)

---

## 1. Purpose

Give store admins (typically one operator on a phone) **real-time device notifications** when:

1. A **new order** is placed (`placeOrder` succeeds).
2. **Payment is confirmed** (Payway webhook or admin `confirmPayment`).
3. A variant crosses into **low stock** (`available ≤ 2` after a stock-affecting mutation).

Notifications must work with the app in background / screen locked, on iOS and Android, via the **standard Web Push** stack (no OneSignal/FCM SaaS in v1).

Separately, the admin must be able to install an **Admin-only PWA** (name, start URL, and scope limited to `/admin`), so the home-screen icon opens the panel—not the storefront.

This document is **not** an implementation plan (tasks/commits live in a later plan doc).

---

## 2. Goals and non-goals

### 2.1 Goals

- Opt-in Web Push for every user in `admin_profiles` who enables it on a device.
- Best-effort delivery: push failures must **never** fail checkout, payment confirmation, or stock RPCs (same discipline as `EmailPort`).
- Deep links: order events → `/admin/pedidos/{orderId}`; low stock → `/admin/catalogo/{productId}`.
- Dedicated admin manifest so “Add to Home Screen” from admin yields **Activate Admin**.
- Server-side VAPID keys; typed tRPC admin procedures; domain `PushPort` adapter.
- Unit tests for payload/threshold/cleanup logic; mocked push in integration paths.

### 2.2 Non-goals (v1)

- Push to storefront customers.
- Per-event preference toggles, quiet hours, custom sounds.
- Multi-tenant roles beyond existing `admin_profiles`.
- Guaranteed delivery / retry queues (best-effort only; dead endpoints pruned).
- Separate service worker file solely for admin (one SW at `/sw.js` is enough if push handlers are added there).
- Changing storefront PWA behavior beyond keeping it as the customer install path.

---

## 3. Constraints and platform notes

| Platform | Requirement |
|----------|-------------|
| **iOS Safari** | Web Push only for **installed** Home Screen web apps (iOS 16.4+). Admin must install **Activate Admin** PWA, then grant notification permission inside that app. |
| **Android Chrome** | Permission can work in browser; **installing** the admin PWA is still recommended for reliability and icon UX. |
| **Desktop** | HTTPS + service worker + permission; install optional. |
| **HTTPS** | Required in production (already true on Vercel). |

Low-stock threshold is **fixed at `available ≤ 2`** for v1 (not configurable in `store_settings`).

---

## 4. Chosen approach

**Native Web Push (VAPID) + `web-push` library + domain `PushPort`**

Rejected alternatives:

- **OneSignal / Firebase:** external dependency and admin device data outside our DB; overkill for 1–2 admins.
- **Email-only admin alerts:** does not meet “push on phone” UX.

Mirrors existing email architecture: domain calls a port; adapters implement transport; routers stay thin.

---

## 5. Architecture

```text
┌─────────────────┐     subscribe      ┌──────────────────────┐
│ Admin UI (PWA)  │ ─────────────────► │ tRPC admin.push.*    │
│ Permission + SW │ ◄── VAPID public ──│ adminProcedure only  │
└────────┬────────┘                    └──────────┬───────────┘
         │ push event                             │ service role
         ▼                                        ▼
┌─────────────────┐                    ┌──────────────────────┐
│ public/sw.js    │                    │ push_subscriptions   │
│ showNotification│                    │ (endpoint + keys)    │
│ notificationclick                    └──────────▲───────────┘
└─────────────────┘                               │
                                                  │ sendToAdmins
┌─────────────────┐     domain events  ┌─────────┴────────────┐
│ placeOrder /    │ ─────────────────► │ PushPort (web-push)  │
│ confirmPayment /│   best-effort      │ prune 404/410        │
│ stock paths     │                    └──────────────────────┘
└─────────────────┘
```

### 5.1 Layers

| Layer | Responsibility |
|-------|----------------|
| **Domain** | When to notify; build payload (`title`, `body`, `url`, `tag`); call `PushPort` best-effort; low-stock threshold edge detection |
| **PushPort** | `sendToAdmins(payload)`; load all subscriptions; send via web-push; delete gone endpoints |
| **tRPC admin.push** | Expose VAPID public key; subscribe / unsubscribe / status for the logged-in admin |
| **SW** | `push` → `showNotification`; `notificationclick` → open/focus admin deep link |
| **Admin PWA** | Separate manifest under `/admin`; layout links that manifest |

### 5.2 Dependency injection

Extend the same pattern as email:

- `PushPort` interface in `src/server/push/port.ts`
- `createWebPushAdapter` (or equivalent) reading `VAPID_*` env
- No-op / console adapter when keys missing (local dev without push)
- Domain functions receive `push?: PushPort` (or required no-op) so tests inject mocks

---

## 6. Admin-only PWA

### 6.1 Problem today

Single manifest (`src/app/manifest.ts`):

- `name`: “Activate Moda Deportiva”
- `start_url`: `/`
- `scope`: `/`
- Shortcut to `/admin/login` only

Installing from the site always produces a **store** app. Admin is a shortcut, not a dedicated shell.

### 6.2 Target behavior

| | Storefront PWA (keep) | Admin PWA (add) |
|--|----------------------|-----------------|
| Manifest route | existing `/manifest.webmanifest` | `/admin/manifest.webmanifest` (App Router route or static) |
| `name` / `short_name` | Activate Moda Deportiva / Activate | **Activate Admin** / **Admin** |
| `start_url` | `/` | `/admin` (or `/admin/pedidos` if preferred at implement time; default **`/admin`**) |
| `scope` | `/` | **`/admin`** |
| `display` | `standalone` | `standalone` |
| Icons | existing brand icons | same icons acceptable in v1; optional admin-badged icons later |
| Who installs | customers (optional) | **admin operator** from `/admin` or `/admin/login` |

### 6.3 Manifest discovery

- **Admin layout** (`src/app/admin/layout.tsx`): set metadata / `<link rel="manifest" href="/admin/manifest.webmanifest">` so Safari/Chrome associate install with admin.
- **Root layout**: keep storefront manifest for `/` (do not force admin manifest site-wide).
- `apple-web-app-title` already “Activate Admin” on admin layout — keep aligned with manifest `short_name`.

### 6.4 Service worker

- Keep **one** SW at `/public/sw.js`, registered site-wide in production (existing `RegisterServiceWorker`).
- Add `push` and `notificationclick` handlers.
- Existing cache rules that **skip** `/admin` network caching remain correct (admin always network).
- Scope of SW (`/`) can be wider than admin manifest `scope` (`/admin`). That is intentional: push delivery is SW-scoped; the **installed app window** is manifest-scoped so standalone UI stays under `/admin`.

### 6.5 Operator setup (product copy)

Spanish UI should state clearly:

1. Abrí el panel en **Safari** (iPhone) o Chrome (Android).
2. **Agregar a inicio** → ícono “Activate Admin”.
3. Abrí esa app, iniciá sesión, tocá **Activar notificaciones**.

---

## 7. Data model

### 7.1 Table `public.push_subscriptions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `admin_user_id` | `uuid` not null | Supabase Auth user id; must exist in `admin_profiles` |
| `endpoint` | `text` not null | Push service URL; **UNIQUE** |
| `p256dh` | `text` not null | Client key |
| `auth` | `text` not null | Client auth secret |
| `user_agent` | `text` null | Debug |
| `created_at` | `timestamptz` not null default `now()` | |
| `updated_at` | `timestamptz` not null default `now()` | Bump on re-subscribe |

Indexes:

- `unique (endpoint)`
- `index (admin_user_id)`

### 7.2 RLS

- Enable RLS.
- **No** anon/authenticated direct client writes required if all mutations go through tRPC + **service role** after `adminProcedure` checks (preferred; matches orders pattern).
- Optional hardening: deny all to `authenticated`/`anon` explicitly.

### 7.3 Types

After migration: update `src/server/db/types.ts` (or regenerate) for `push_subscriptions`.

### 7.4 Low-stock dedup (no extra table required)

Detect edge in domain when recomputing availability after a mutation:

- Let `before = available` prior to applying the reservation/deduction effect used for the check, and `after` after.
- Fire `stock.low` only when **`before > 2` and `after <= 2`** (including `after === 0`).
- If already `<= 2` before the event, **do not** notify again.

If a clean “before” is awkward in a given path, equivalent rule: notify only on the transition into the low band in that code path’s availability snapshot. Do not spam on every subsequent order while still low.

Restock above 2 resets eligibility naturally (next drop across the boundary notifies again).

---

## 8. Domain events and payloads

### 8.1 Events

| Event key | Trigger | Title (ES, illustrative) | Body | `url` | `tag` (collapse) |
|-----------|---------|--------------------------|------|-------|------------------|
| `order.created` | After successful `placeOrder` | Nuevo pedido | `{code}` · total formatted · method | `/admin/pedidos/{id}` | `order-{id}-created` |
| `order.payment_confirmed` | After payment confirmed (Payway path + admin confirm) | Pago confirmado | `{code}` | `/admin/pedidos/{id}` | `order-{id}-paid` |
| `stock.low` | After stock-affecting path when threshold edge hit | Stock bajo | `{productName}` · `{size/color}` · quedan `{n}` | `/admin/catalogo/{productId}` | `stock-{variantId}` |

Payload JSON pushed to the browser (keep small; **no** customer email, **no** `access_token`, **no** payment proof URLs):

```ts
type AdminPushPayload = {
  title: string;
  body: string;
  url: string; // path only, e.g. /admin/pedidos/uuid
  tag: string;
  event: "order.created" | "order.payment_confirmed" | "stock.low";
};
```

### 8.2 Best-effort helper

Shared helper (name illustrative): `sendAdminPushBestEffort(push, payload)` — try/catch, swallow errors, never throw to callers.

Call sites (conceptual):

1. `placeOrder` — after order persisted + customer email best-effort (order of email vs push does not matter).
2. Payment confirmation domain path used by Payway notification handler and admin `confirmPayment`.
3. After `placeOrder` — evaluate low-stock edge per line using quote-time availability (`before = available`, `after = available - qty`). **v1 does not** notify on admin catalog stock edits; that can be added later.

### 8.3 Fan-out

`PushPort.sendToAdmins`:

1. Select **all** rows in `push_subscriptions` (every admin device).
2. Send in parallel with a modest concurrency limit if needed (v1: simple `Promise.allSettled` is fine for tiny N).
3. On HTTP **404** or **410** from push service: **delete** that subscription row.
4. Other errors: log; leave row.

---

## 9. PushPort API

```ts
// src/server/push/port.ts
export type AdminPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  event: "order.created" | "order.payment_confirmed" | "stock.low";
};

export type PushPort = {
  sendToAdmins(payload: AdminPushPayload): Promise<void>;
};
```

Web Push adapter responsibilities:

- Configure `web-push` with `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` contact).
- Map DB rows → web-push subscription shape.
- TTL / urgency: defaults acceptable; `urgency: high` optional for order/payment.

Missing env → no-op adapter (resolve like email when Resend key absent).

---

## 10. tRPC contract (`admin.push`)

All procedures: **`adminProcedure`** (Bearer + `admin_profiles` row).

| Procedure | Input | Output | Behavior |
|-----------|--------|--------|----------|
| `getVapidPublicKey` | none | `{ publicKey: string }` | Throws domain/config error if unset in prod paths that need subscribe |
| `status` | optional `{ endpoint?: string }` | `{ enabledOnDevice: boolean, permissionHint?: string }` | If `endpoint` provided, whether that row exists for **this** `admin_user_id` |
| `subscribe` | `{ endpoint, p256dh, auth, userAgent? }` | `{ ok: true }` | Upsert by `endpoint`; set `admin_user_id` to caller; reject if not admin (already enforced) |
| `unsubscribe` | `{ endpoint }` | `{ ok: true }` | Delete row if owned by caller (or delete by endpoint only for this user) |

Update `docs/contracts/procedure-map.md` and keep `AppRouter` export accurate.

### 10.1 Client subscribe flow

1. Ensure SW registered (`/sw.js`).
2. `Notification.requestPermission()` → must be `granted`.
3. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey })`.
4. `admin.push.subscribe` with endpoint + keys.
5. UI shows “Activas en este dispositivo”.

Unsubscribe: `pushManager.getSubscription()` → `subscription.unsubscribe()` + `admin.push.unsubscribe`.

---

## 11. Service worker behavior

### 11.1 `push`

- Parse JSON payload (`AdminPushPayload`).
- `self.registration.showNotification(title, { body, tag, data: { url }, icon: "/icons/icon-192.png", badge: optional })`.

### 11.2 `notificationclick`

- `event.notification.close()`.
- Target URL = origin + `data.url` (must start with `/admin` — ignore or harden against open redirects).
- `clients.matchAll` / `openWindow` / `focus` standard pattern so an existing admin PWA window navigates when possible.

### 11.3 Cache policy

No change required to “never cache `/admin`” fetch rules.

---

## 12. Admin UI

### 12.1 Placement

Primary: card on **`/admin`** home and/or **`/admin/config`** (implementer picks one primary surface; config is enough if home stays order-focused—**prefer `/admin/config`** plus a one-line status on `/admin` if easy).

### 12.2 States (Spanish copy)

| State | UI |
|-------|-----|
| Unsupported browser | “Tu navegador no soporta notificaciones push.” |
| Not installed (iOS heuristic optional) | Short steps: agregar a inicio → abrir app → activar |
| Permission default | Button **Activar notificaciones** |
| Permission denied | “Activá las notificaciones en Ajustes del sistema.” |
| Subscribed | “Notificaciones activas en este dispositivo” + **Desactivar** |

### 12.3 Auth

Subscribe only when admin session is valid. If notification opens app cold without session, existing admin login flow applies; deep link path should survive post-login if the app already supports return URLs—**nice-to-have**, not blocking: opening `/admin/pedidos/{id}` after login manually is acceptable if return-URL plumbing is missing.

---

## 13. Configuration and secrets

| Env | Purpose |
|-----|---------|
| `VAPID_PUBLIC_KEY` | Browser `applicationServerKey` + server |
| `VAPID_PRIVATE_KEY` | Server only — never expose to client |
| `VAPID_SUBJECT` | `mailto:ops@…` or site contact | 

Document in `.env.example`. Generate once with `web-push generate-vapid-keys` (or equivalent); rotate = all clients must re-subscribe.

Deploy: set on Vercel/Railway as applicable for this project’s host.

---

## 14. Security

1. **Authz:** only `adminProcedure` may register endpoints.
2. **PII:** push body excludes customer email, phone, address, access tokens, proof paths.
3. **Open redirect:** SW and any client handler only navigate to same-origin paths under `/admin`.
4. **Endpoint ownership:** unsubscribe limited to caller’s `admin_user_id` (or endpoint+user match).
5. **RLS + service role:** no broad anon insert on `push_subscriptions`.
6. **VAPID private key** server-only.

---

## 15. Testing strategy

| Layer | What |
|-------|------|
| Unit | Payload builders; low-stock edge (`before>2 && after<=2`); URL allowlist helper; 404/410 prune logic with mock DB |
| Unit/integration | `subscribe` upsert; `unsubscribe` ownership |
| Domain | `placeOrder` / confirm paths call push mock once; failures in push mock do not fail order |
| Manual | Install admin PWA on iOS + Android; place test order; confirm payment; drive stock to ≤2 |

CI does **not** call real FCM/APNs.

---

## 16. Docs to update (implementation phase)

- `docs/contracts/procedure-map.md` — `admin.push.*`
- `docs/contracts/domain-invariants.md` — brief “admin push best-effort” + low-stock threshold
- `docs/contracts/backend-for-frontend.md` — optional admin push snippet
- `.env.example` — VAPID vars
- `AGENTS.md` quick table row if useful (“Admin push” → `src/server/push/**`)

---

## 17. Implementation workspace

- Feature work runs in a **git worktree** (branch name descriptive, e.g. `feat/admin-web-push`), not only on the primary checkout.
- Commits remain **GPG-signed** (`git commit -S`); agents prepare commits for human signing when TTY is unavailable.
- Spec/plan docs may land on the branch with the feature or on main first by team preference; default: spec on the feature branch with the plan.

---

## 18. Rollout checklist (ops)

1. Generate VAPID keys; set env on production.
2. Ship migration `push_subscriptions`.
3. Deploy app with SW push handlers (clients may need one revisit to update SW).
4. Admin: install **Activate Admin** → login → Activar notificaciones.
5. Smoke: test order + payment + stock edge.

---

## 19. Open decisions locked in this design

| Topic | Decision |
|-------|----------|
| Transport | Web Push + VAPID + `web-push` |
| Recipients | All subscribed admin devices |
| Events | order created, payment confirmed, stock low |
| Low stock | `available ≤ 2`, edge-triggered |
| Deep links | order detail / product catalog detail |
| PWA | Separate admin manifest, `scope: /admin` |
| SaaS push | Out of scope |
| Worktree | Required for implementation |

---

## 20. Success criteria

- Admin on installed Activate Admin PWA receives a notification within seconds of a test `placeOrder` (network permitting).
- Payment confirmation produces a second, distinct notification (different `tag`).
- Driving a variant from 3 → 2 units produces one low-stock notification; further sales at ≤2 do not repeat until restock above 2.
- Storefront install path still installs the **store** PWA; admin install path installs **Activate Admin**.
- Checkout still succeeds if VAPID misconfigured or all endpoints dead.

---

*End of design. Implementation plan is a separate document under `docs/superpowers/plans/`.*

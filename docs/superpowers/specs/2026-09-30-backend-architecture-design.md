# Backend Architecture Design — Activate Moda Deportiva

**Date:** 2026-09-30  
**Status:** Approved for implementation planning  
**Scope:** Backend only inside a single Next.js monosystem  
**Product source of truth:** `docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`  
**Language of this document:** English  
**Product UI language:** Spanish (Argentina)

---

## 1. Purpose

Define the backend architecture for Activate Moda Deportiva v1 so that:

1. This team implements **server-side domain, data, auth, jobs, email, and storage** only.
2. Another team (and their AI agents) can build the UI against a **stable, typed contract** without reverse-engineering internals.
3. Behavior matches the PRD: guest checkout, variant stock, 24h reservations, admin panel APIs, emails, order tracking.

This document is **not** a UI design and **not** an implementation plan (tasks/commits live in a later plan doc).

---

## 2. System shape

### 2.1 Monosystem

- One **Next.js** application (App Router), deployed on **Vercel**.
- Frontend and backend live in the **same repo and deploy**.
- Backend ownership is enforced by folders and contracts, not by a separate service.

### 2.2 Approach (chosen)

**Domain core + tRPC + adapters**

| Layer | Role |
|--------|------|
| **Domain** | Pure business rules: catalog reads, pricing, checkout, order state machine, stock reservations |
| **tRPC** | Typed transport for the UI; thin procedures that call domain |
| **Adapters** | Supabase (Postgres, Auth, Storage), Resend, Vercel Cron route |
| **HTTP extras** | Only where tRPC is a poor fit: cron endpoint, health |

Rejected alternatives:

- **Supabase-first (RLS + Edge for core checkout):** harder to test order/stock machine; blurs Next backend ownership.
- **Feature folders without shared domain:** risk of duplicated pricing/stock rules.

### 2.3 Stack decisions (locked)

| Concern | Choice |
|---------|--------|
| Hosting | Vercel |
| Framework | Next.js (current stable per Context7 at scaffold time) |
| API style | **tRPC** (procedures + shared `AppRouter` type) |
| Input validation | Zod on every procedure |
| Database | Supabase Postgres |
| Local dev/test DB | **Supabase local** (`supabase start`) — no hand-rolled standalone Postgres required |
| Schema source of truth | SQL migrations under `supabase/migrations` |
| Admin auth | Supabase Auth + `admin_profiles` |
| Buyer accounts | **None** in v1 |
| File storage | Supabase Storage |
| Email | Resend |
| Cart | **Hybrid:** client-held cart; server revalidates on quote/place order |
| Money | **Integer cents** (ARS × 100) |
| Totals | **Server-only**; never trust client totals |
| Reservation expiry job | Vercel Cron → secured Route Handler → domain |
| Docs freshness | Use **Context7** when scaffolding or upgrading libraries (Next, tRPC, Supabase, Zod, Resend) |

---

## 3. Bounded contexts

| Context | Responsibility | Must not own |
|---------|----------------|--------------|
| **Catalog** | Categories tree, products, images, variants (color × size), published flag, size guides, search (name + category/subcategory names) | Order totals, payment |
| **Pricing** | List/promo price, payment discount %, Andreani fee, free-shipping threshold, quote algorithm in cents | Persistence of orders |
| **Checkout** | Hydrate cart lines, validate shipping/payment rules, atomic `placeOrder` + 24h reservation | Cart UI persistence |
| **Orders** | Status machine, tracking by code/token, payment proofs, admin transitions, cancel, expiry | Catalog CRUD |
| **Settings** | CBU/alias text, discount %, shipping knobs, season label, WhatsApp, Instagram, contact placeholders | Home CMS (out of scope) |
| **Identity** | Admin session, `adminProcedure` | Buyer login |
| **Notifications** | Resend templates fired from domain events | Deciding transitions |
| **Files** | Product image uploads (admin), payment proof uploads (buyer while pending), signed URLs | Business rules |

### 3.1 Purchase mental model

1. UI keeps cart in client storage.
2. Before pay UI may call `checkout.quote`.
3. `checkout.placeOrder` sends variant lines + buyer + shipping + payment (no trusted total).
4. Server recomputes prices and available stock; on success creates `pendiente_pago`, reservations, email.
5. Admin confirms payment and advances status; cron expires unpaid reservations at 24h.

---

## 4. Data model (Supabase Postgres)

Table/column names: **English**. User-facing copy: Spanish in the app.

### 4.1 Tables

**`admin_profiles`**

- `user_id` UUID PK/FK → `auth.users`
- Presence of a row means **admin** (no fine-grained roles in v1)

**`categories`**

- `id`, `slug`, `name`, `parent_id` (nullable; null = top: Mujer / Hombre / Accesorios), `sort_order`
- Seed matches PRD category tree

**`size_guides`**

- `id`, `name`, `storage_path` (or structured body if needed later)
- Linked **per product**, optional

**`products`**

- `id`, `name`, `slug` (unique), `description`
- `category_id` (leaf subcategory)
- `list_price_cents` INT NOT NULL CHECK ≥ 0
- `promo_price_cents` INT NULL CHECK ≥ 0
- `size_guide_id` NULL
- `is_published` BOOLEAN
- `created_at`, `updated_at`

**`product_images`**

- `id`, `product_id`, `storage_path`, `sort_order`, `alt`

**`product_variants`**

- `id`, `product_id`
- `color` TEXT, `size` TEXT (`Único` allowed)
- `stock_on_hand` INT NOT NULL CHECK ≥ 0
- UNIQUE `(product_id, color, size)`

**Sellable quantity**

```text
available = stock_on_hand - SUM(qty of stock_reservations where status = 'active' for variant)
```

**`store_settings`**

Singleton row (or key/value with known keys). Fields:

- `transfer_cbu_alias_text` (copy-paste for buyers)
- `payment_discount_bps` INT (default 1000 = 10.00%)
- `andreani_fee_cents` INT
- `free_shipping_threshold_cents` INT
- `season_label` TEXT (header subtitle; e.g. “Moda deportiva”)
- `whatsapp_url_or_phone`, `instagram_url`
- contact/legal placeholder fields as needed for footer APIs

**`orders`**

- `id` UUID
- `code` TEXT UNIQUE (human-facing)
- `access_token` TEXT UNIQUE (magic link)
- `status` ENUM/TEXT:
  - `pendiente_pago` | `pago_confirmado` | `preparando` | `listo_retiro` | `enviado` | `entregado` | `cancelado`
- Buyer: `customer_name`, `phone`, `email`
- `shipping_method`: `pickup` | `andreani`
- `payment_method`: `transfer` | `cash`
- Money snapshots (cents): `subtotal_cents`, `discount_cents`, `shipping_cents`, `total_cents`
- `shipping_address` JSONB NULL (required when Andreani; Photon-assisted payload)
- `reservation_expires_at` TIMESTAMPTZ NULL (set on create while pending payment)
- `cancel_reason` NULL: `admin` | `expired`
- `created_at`, `updated_at`, `cancelled_at`

**Constraints**

- CHECK: `payment_method = 'cash'` ⇒ `shipping_method = 'pickup'`
- CHECK: money fields ≥ 0

**`order_items`**

- `order_id`, `variant_id` (nullable if variant deleted later — prefer keep FK or snapshot-only)
- Snapshots: `product_name`, `color`, `size`, `unit_price_cents`, `qty`

**`stock_reservations`**

- `id`, `order_id`, `variant_id`, `qty`
- `expires_at`
- `status`: `active` | `consumed` | `released`

**`payment_proofs`**

- `id`, `order_id`, `storage_path`, `uploaded_at`
- Current proof = latest row per order (or explicit `is_current` flag)

### 4.2 Indexes (minimum)

- `orders(code)`, `orders(access_token)`
- `stock_reservations(expires_at)` filtered where `status = 'active'`
- `products` search helpers on `name`; category name join for search
- `product_variants(product_id)`

### 4.3 RLS orientation

Buyers have **no** Supabase user.

| Path | Access |
|------|--------|
| Server tRPC (Vercel) | Uses **service role** (or carefully scoped server client) after domain authz |
| Admin browser | Supabase JWT; server verifies user ∈ `admin_profiles` |
| Anon direct table writes | **Denied** for orders/stock; do not expose open insert policies for guests |

Public catalog reads may be allowed via RLS **or** only through server procedures (prefer **server procedures only** for one access path and simpler reasoning).

### 4.4 Migrations & local

- All schema changes: `supabase/migrations/*.sql`
- Dev: `supabase start`, `supabase db reset` (migrations + seed)
- Seed: PRD category tree + sample products/variants for UI and integration tests
- CI: start Supabase local (or service container equivalent) and run tests

---

## 5. Money and quote algorithm

### 5.1 Representation

- Store and compute in **integer cents**.
- Format for UI (`$ 12.345,67`) is a **presentation** concern; backend may expose cents + optional formatted string helper, but cents are canonical.

### 5.2 Unit price

For each line: `promo_price_cents` if not null, else `list_price_cents` (at quote/place time; snapshot into `order_items`).

### 5.3 Total calculation (mandatory order)

Same function for `checkout.quote` and `checkout.placeOrder`:

1. `subtotal = Σ (unit_price_cents × qty)`
2. `discount = floor(subtotal × payment_discount_bps / 10000)` for `transfer` and `cash` (settings-driven; default 10%)
3. `shippingBase = subtotal - discount`
4. `shipping = 0` if `pickup`; else if `shippingBase >= free_shipping_threshold_cents` then `0` else `andreani_fee_cents`
5. `total = subtotal - discount + shipping`

Discount never applies to shipping.

### 5.4 Settings changes

Changing discount %, Andreani fee, or threshold applies to **new** quotes/orders only. Existing orders keep snapshots.

---

## 6. Stock and reservations

### 6.1 `placeOrder` transaction

Inside one DB transaction:

1. `SELECT … FOR UPDATE` on affected `product_variants`.
2. Compute `available` per variant (on_hand − active reservations).
3. If any line exceeds available → abort entire transaction → error `STOCK_INSUFFICIENT` (no order row).
4. Insert `orders` (`pendiente_pago`, `reservation_expires_at = now + 24h`, money snapshots, code, token).
5. Insert `order_items` snapshots.
6. Insert `stock_reservations` (`active`, same expiry).
7. Commit.
8. Enqueue/send “order created” email (best-effort after commit; failure must not roll back order; log + optional retry).

### 6.2 Lifecycle of a reservation

| Event | Reservation status | `stock_on_hand` |
|-------|--------------------|-----------------|
| placeOrder | `active` | unchanged |
| confirmPayment | `consumed` | decreased by qty (idempotent) |
| cancel (admin) or expire job | `released` | unchanged (availability returns) |

### 6.3 Concurrency

Two buyers racing the last unit: first committed transaction wins; second gets `STOCK_INSUFFICIENT`.

---

## 7. Order status machine

```text
pendiente_pago → pago_confirmado → preparando → (listo_retiro | enviado) → entregado
                 ↘ cancelado (admin or expiry job)
```

| From | Action | Actor | To | Side effects |
|------|--------|-------|-----|--------------|
| — | placeOrder | system | pendiente_pago | reservations active 24h; email created |
| pendiente_pago | uploadPaymentProof | buyer (code/token) | same | store/replace proof |
| pendiente_pago | confirmPayment | admin | pago_confirmado | consume reservations; reduce on_hand; email |
| pago_confirmado | startPreparing | admin | preparando | |
| preparando | markReadyForPickup | admin | listo_retiro | only if pickup; email |
| preparando | markShipped | admin | enviado | only if andreani; email |
| listo_retiro \| enviado | markDelivered | admin | entregado | email |
| not entregado (allowed set) | cancel | admin | cancelado | release active reservations; email; money refund offline |
| pendiente_pago past expiry | expire | cron | cancelado | release; `cancel_reason=expired`; email |
| entregado | cancel | — | **forbidden** | |

Invalid transitions → stable error `INVALID_TRANSITION`.

Admin may cancel after payment confirmation and before `entregado`. Inventory restore rules:

| Order status when cancelled | Inventory action |
|----------------------------|------------------|
| `pendiente_pago` | Set related reservations `released` (on_hand unchanged) |
| `pago_confirmado` or later (not `entregado`) | If reservations were `consumed` and `stock_on_hand` already decreased: **increment `stock_on_hand` by item qtys** (or equivalent single domain function `restoreStockForOrder`). Mark reservations `released` if still present. Idempotent: never double-restore. |
| `entregado` | Cancel forbidden |

---

## 8. tRPC surface (contract for UI team)

### 8.1 Layout

```text
supabase/
  migrations/
  seed.sql
src/server/
  db/
  domain/
    catalog/
    pricing/
    checkout/
    orders/
    settings/
  trpc/
    context.ts
    trpc.ts          # publicProcedure, adminProcedure
    router.ts        # AppRouter
    routers/
      catalog.ts
      checkout.ts
      orders.ts
      settings.ts
      admin/
        catalog.ts
        orders.ts
        settings.ts
  email/
  storage/
  jobs/
    expire-reservations.ts
app/api/trpc/[trpc]/route.ts
app/api/cron/expire-reservations/route.ts
docs/contracts/
  backend-for-frontend.md
  domain-invariants.md
  procedure-map.md
```

Exact package manager and path aliases are fixed at scaffold; structure above is normative for ownership.

### 8.2 Public procedures (no buyer login)

| Procedure | Purpose |
|-----------|---------|
| `catalog.listCategories` | Tree for nav/home |
| `catalog.listProducts` | By category/subcategory, published only |
| `catalog.getProduct` | By slug or id + variants + images + size guide |
| `catalog.search` | Query against product name and category/subcategory names |
| `settings.getPublic` | Season label, WhatsApp, Instagram, public contact; checkout needs CBU/alias text |
| `checkout.quote` | Lines + shipping + payment → priced breakdown + stock check (no persist) |
| `checkout.placeOrder` | Same + buyer fields → create order |
| `orders.getByCode` | Tracking payload |
| `orders.getByToken` | Tracking via magic link token |
| `orders.uploadPaymentProof` | Only `pendiente_pago`; authz by code or token |

### 8.3 Admin procedures (`adminProcedure`)

| Area | Capabilities |
|------|----------------|
| Catalog | CRUD products, images, variants/stock, publish flag, size guide attach |
| Orders | List/filter, detail, proofs signed URLs, status transitions, cancel |
| Settings | Update store_settings fields |

### 8.4 Stable error codes

Procedures throw typed errors (tRPC error cause or custom code field) with **stable codes**:

| Code | When |
|------|------|
| `VALIDATION_ERROR` | Zod / bad input |
| `UNAUTHORIZED` | Missing/invalid admin session where required |
| `FORBIDDEN` | Authenticated but not admin |
| `STOCK_INSUFFICIENT` | Quote/place cannot fulfill lines |
| `INVALID_PAYMENT_SHIPPING_COMBO` | e.g. cash + andreani |
| `ORDER_NOT_FOUND` | Bad code/token |
| `ORDER_NOT_PENDING` | Proof upload or invalid op on status |
| `RESERVATION_EXPIRED` | Op on expired pending order if distinguished |
| `INVALID_TRANSITION` | Illegal status change |
| `CONFLICT` | Idempotency / duplicate where needed |

UI and external AI must branch on **codes**, not English/Spanish message text.

### 8.5 Context

tRPC context provides: DB client, optional admin user, request id, ports (email, storage). Domain functions accept explicit deps for tests.

---

## 9. Auth

- **Admins:** Supabase Auth (email/password or whatever is configured); server loads session; requires `admin_profiles` row.
- **Buyers:** no auth. Order access = knowledge of `code` and/or `access_token` (treat token as secret; send only over email/HTTPS).
- Multiple admins allowed; same permissions.

---

## 10. Storage

| Bucket | Visibility | Writers |
|--------|------------|---------|
| Product images | Public read | Admin via server |
| Payment proofs | Private | Buyer via server when pending; admin read via signed URL |

Max size/MIME validated in domain/adapter. Virus scanning out of scope v1.

---

## 11. Email (Resend)

Port interface: `EmailPort.send(template, payload)`.

| Event | Email |
|-------|--------|
| Order created (`pendiente_pago`) | Yes — code, magic link, transfer instructions if transfer |
| Payment confirmed | Yes |
| Ready for pickup | Yes if applicable |
| Shipped | Yes if applicable |
| Delivered | Yes |
| Cancelled (admin or expired) | Yes |

- Production: Resend API.
- Local/test: `ConsoleEmail` or Resend test mode.
- Email failure after successful commit: log; do not delete order; optional admin resend later.

---

## 12. Cron / jobs

- **Vercel Cron** hits `POST /api/cron/expire-reservations` with `Authorization: Bearer CRON_SECRET` (or equivalent header).
- Handler calls `expireReservations(now)` in domain:
  - Find `pendiente_pago` with `reservation_expires_at < now`
  - Cancel + release reservations + email (idempotent if re-run)
- Local: `pnpm jobs:expire` (name fixed at scaffold) against local Supabase.

No Inngest/Trigger.dev in v1 unless later justified.

---

## 13. Cart (hybrid)

- UI stores lines `{ variantId, qty }` (and display cache if it wants).
- Server never requires a `carts` table in v1.
- On quote/placeOrder, server loads current prices and availability; rejects stale assumptions via errors.
- Optional later: server cart — out of scope unless PRD changes.

---

## 14. Security checklist

- Service role key only on server.
- Cron secret required.
- No trust of client prices/totals/stock.
- Order tracking does not leak other customers’ data.
- Admin routes all behind `adminProcedure`.
- Zod everywhere.
- PII minimized in logs (prefer order id/code).

---

## 15. Testing strategy

| Layer | What |
|-------|------|
| Unit | Pricing math, transition guards, cash/pickup rules (no DB) |
| Integration | placeOrder, concurrent stock, confirm payment, expire job (Supabase local) |
| Contract smoke | tRPC procedures happy path + stable error codes |
| Seed | Categories + sample catalog for UI |

Always prefer Supabase local over shared cloud DB for automated tests.

---

## 16. Deliverables for the other team and their AI

Mandatory documentation package (backend “done” includes these living docs):

| Artifact | Content |
|----------|---------|
| `docs/contracts/backend-for-frontend.md` | How to create tRPC client, admin session, env vars, example quote/placeOrder, proof upload flow |
| `docs/contracts/domain-invariants.md` | Totals order, stock formula, status diagram, 24h rule |
| `docs/contracts/procedure-map.md` | Every procedure: name, input Zod summary, output shape, errors |
| Exported `AppRouter` type | Compile-time contract |
| Root or docs README section | `supabase start`, migrate/seed, env template, scripts |

**Rules for consumer AI/humans:**

1. Call only documented procedures; do not invent parallel REST for the same ops.
2. Branch on stable error codes.
3. Never compute chargeable totals locally for submission.
4. Admins use Supabase session; buyers use code/token only.

---

## 17. Explicit non-goals (v1 backend)

- Payway / Mercado Pago / cards
- Buyer registration and “my orders” auth
- Server-persisted cart
- Home CMS / hero editor
- Fine-grained admin roles
- Native apps
- Advanced search (synonyms, facets)
- Change/return request workflows
- Multi-tenant / multi-store

---

## 18. Implementation principles

1. **Domain first** — routers and cron are thin.
2. **One quote function** shared by quote and placeOrder.
3. **Idempotent jobs** — expiry safe to re-run.
4. **Context7** before wiring new library APIs.
5. **Document for strangers** — assume the next reader is another AI with only this repo.

---

## 19. Decision log

| Topic | Decision |
|-------|----------|
| Delivery | Next.js monosystem on Vercel |
| API | tRPC + thin cron HTTP |
| DB/Auth/Storage | Supabase; local Supabase for dev/test |
| Email | Resend |
| Cart | Client + server revalidation |
| Money | Integer cents; server totals |
| Architecture style | Domain core + adapters |
| Consumer contract | AppRouter + docs/contracts/* |

---

## 20. Next step

After stakeholder review of this file: write the **implementation plan** under `docs/superpowers/plans/` (scaffold, migrations, domain modules, tRPC, jobs, docs package, tests).

---

*End of backend architecture design — Activate Moda Deportiva.*

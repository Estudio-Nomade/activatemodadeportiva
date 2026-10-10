# Andreani branch (sucursal) shipping — Design

**Date:** 2026-10-09  
**Status:** Draft for user review  
**Scope:** Third checkout shipping option — Andreani to branch/sucursal (not home delivery)  
**Product source of truth:** `docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`  
**Related contracts:** `docs/contracts/domain-invariants.md`, `procedure-map.md`, `backend-for-frontend.md`  
**Language of this document:** English  
**Storefront/admin UI copy language:** Spanish (Argentina)

This document is **not** an implementation plan (tasks/commits live in a later plan doc).

---

## 1. Purpose

Today checkout supports:

- `pickup` — buyer collects at the store
- `andreani` — Andreani **home** delivery (requires full shipping address)

Buyers also need **Andreani to a branch/sucursal**: the parcel ships to an Andreani location and the buyer picks it up there. Same carrier and fee model as home delivery; different destination shape and checkout label.

---

## 2. Goals and non-goals

### 2.1 Goals

- Add shipping method **`andreani_sucursal`** as a first-class option next to `pickup` and `andreani`.
- Same pricing as home Andreani: `andreani_fee_cents` and the same free-shipping threshold.
- Buyer enters branch data as **free text** (no Andreani API / branch search in v1).
- Admin order flow after `preparando` uses **`enviado` → `entregado`** (same as home delivery).
- Cash remains **pickup-only** (`INVALID_PAYMENT_SHIPPING_COMBO` if cash + branch).
- Update domain contracts, tRPC validation, DB enum, labels, and tests.

### 2.2 Non-goals (v1)

- Andreani API integration or branch finder by postal code.
- Separate fee setting (`andreani_branch_fee_cents`) or different free-shipping rules.
- Hybrid status machine (`enviado` then `listo_retiro` at branch).
- Changing home-delivery address schema beyond keeping current fields.

---

## 3. Decisions (locked with product)

| Topic | Decision |
|-------|----------|
| Price | Same fee and free-shipping threshold as `andreani` |
| Branch selection UX | Free-text fields (name, address, city, postal code) |
| Order statuses | Same as home: `preparando` → `enviado` → `entregado` |
| Modeling | New enum value `andreani_sucursal` (not a flag on `andreani`) |

### Rejected alternatives

- **`andreani` + `shippingAddress.kind`:** fewer enum migrations, but admin/UI/reporting stay ambiguous.
- **Single Andreani + notes only:** not a real checkout option; poor buyer/admin clarity.

---

## 4. Domain model

### 4.1 `ShippingMethod`

```ts
type ShippingMethod = "pickup" | "andreani" | "andreani_sucursal";
```

DB: extend `public.shipping_method` enum with `'andreani_sucursal'`.

Existing check constraint stays:

```sql
payment_method <> 'cash' or shipping_method = 'pickup'
```

### 4.2 Totals (`calculateTotals`)

Shipping cents:

| Method | Rule |
|--------|------|
| `pickup` | `0` |
| `andreani` | `0` if post-discount base ≥ threshold, else `andreani_fee_cents` |
| `andreani_sucursal` | **identical** to `andreani` |

Implementation detail: treat any method other than `pickup` with the current Andreani fee branch (or an explicit allow-list of both Andreani methods). Do **not** introduce a second fee setting in v1.

Payment combos:

| Payment | pickup | andreani | andreani_sucursal |
|---------|--------|----------|-------------------|
| transfer | yes | yes | yes |
| payway | yes | yes | yes |
| cash | yes | no | no |

### 4.3 Shipping address

| Method | Required address |
|--------|------------------|
| `pickup` | none (`null`) |
| `andreani` | `line1`, `city`, `postalCode` (optional: province, notes, etc. as today) |
| `andreani_sucursal` | `branchName`, `line1`, `city`, `postalCode` (optional: `province`, `notes`) |

Storage: existing `orders.shipping_address` JSONB. Branch payload example:

```json
{
  "branchName": "Andreani La Plata Centro",
  "line1": "Calle 7 1234",
  "city": "La Plata",
  "postalCode": "1900",
  "province": "Buenos Aires",
  "notes": "optional"
}
```

Validation lives in `assertShippingAddress` (+ Zod on checkout router). Missing/incomplete branch address → domain `VALIDATION_ERROR` (same family as home Andreani missing address).

### 4.4 Status machine

| From | To | Condition |
|------|-----|-----------|
| `preparando` | `listo_retiro` | `shipping_method = pickup` only |
| `preparando` | `enviado` | `shipping_method ∈ {andreani, andreani_sucursal}` |

`listo_retiro` is **not** valid for `andreani_sucursal`. Invalid move → `INVALID_TRANSITION`.

---

## 5. API / contracts

### 5.1 Checkout procedures

`checkout.quote` and `checkout.placeOrder` (and any shared input schema):

- `shippingMethod`: `"pickup" | "andreani" | "andreani_sucursal"`
- Super-refine / domain:
  - `andreani` / `andreani_sucursal` require `shippingAddress`
  - branch requires `branchName` + base fields
  - cash requires `pickup`

Outputs unchanged in shape; `shippingMethod` and totals reflect the new method. Order rows persist `shipping_method = andreani_sucursal` and branch JSON.

### 5.2 Public settings / estimates

No new settings fields. Storefront shipping estimate exposes the same Andreani cents for both home and branch (single fee source).

### 5.3 Admin

- Labels: Spanish copy e.g. **“Andreani sucursal”** vs **“Andreani domicilio”** / **“Retiro en local”**.
- Order detail shows branch name + address from `shipping_address`.
- Transition buttons: for branch orders, only the **enviado** path after `preparando` (same as home).
- Emails / order timeline: fulfillment label distinguishes branch.

### 5.4 Contract docs to update (same change set as code)

- `docs/contracts/domain-invariants.md` — totals, combos, address, status table
- `docs/contracts/procedure-map.md` — quote/placeOrder I/O
- `docs/contracts/backend-for-frontend.md` — examples including branch

---

## 6. UI (storefront checkout)

Three shipping choices:

1. Retiro en local (`pickup`)
2. Andreani a domicilio (`andreani`)
3. Andreani a sucursal (`andreani_sucursal`)

When branch is selected:

- Show free-text fields: nombre de sucursal, dirección, ciudad, código postal (optional notes/province if already used for home).
- Hide home-only assumptions; cash remains disabled unless pickup (existing rule).
- Fee display uses the same estimated Andreani amount as home.

No branch map/search in v1.

---

## 7. Error handling

| Situation | Code / behavior |
|-----------|-----------------|
| cash + non-pickup | `INVALID_PAYMENT_SHIPPING_COMBO` |
| branch without required address fields | `VALIDATION_ERROR` (Zod and/or `assertShippingAddress`) |
| `preparando` → `listo_retiro` on branch | `INVALID_TRANSITION` |
| `preparando` → `enviado` on branch | allowed |

Stable `domainCode` surface for UI branching; do not invent a new code unless contracts already need one for address (prefer existing validation path).

---

## 8. Testing

- **Unit pricing:** `andreani_sucursal` under threshold → fee; over threshold → 0; equals `andreani` for same basket.
- **Unit address:** branch requires `branchName` + base; home does not require `branchName`; pickup skips address.
- **Unit status:** `enviado` allowed for branch; `listo_retiro` denied.
- **Unit combo:** cash + branch rejected.
- **Integration placeOrder:** persists method + branch JSON; quote totals match.
- **UI:** three options; branch form visible when selected (smoke/component as existing patterns allow).

---

## 9. Implementation touchpoints (reference, not a plan)

| Area | Likely files |
|------|----------------|
| DB enum | new migration under `supabase/migrations/` |
| Types | `src/server/db/types.ts` (regen or hand-update enum) |
| Pricing | `src/server/domain/pricing/calculate-totals.ts` (+ tests) |
| Address | `src/server/domain/checkout/address.ts` |
| Quote / place order | `src/server/domain/checkout/quote.ts`, `place-order.ts` |
| Status | `src/server/domain/orders/status.ts` (+ tests) |
| tRPC | `src/server/trpc/routers/checkout.ts` |
| Storefront | `src/app/checkout/page.tsx`, `src/lib/shipping/estimate-shipping.ts` |
| Labels | admin auth helpers / order timeline / emails as needed |
| Contracts | `docs/contracts/*` |

Routers stay thin; domain owns rules. SQL RPCs already cast `shipping_method` from payload — enum extension is enough if cast uses `public.shipping_method`.

---

## 10. Rollout notes

- Backward compatible for existing orders (`pickup` / `andreani` unchanged).
- No backfill required.
- Deploy migration before app code that sends `andreani_sucursal`, or ship together.

---

## 11. Open items

None for v1. Future (explicitly deferred): Andreani branch API search, separate branch fee, richer tracking statuses at sucursal.

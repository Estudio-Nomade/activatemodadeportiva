# Admin Payway installments configuration

**Date:** 2026-10-10  
**Status:** approved design  
**Scope:** expose `store_settings.payway_installments` on `/admin/config` so operators can change allowed Payway cuota options without env redeploys.

## Context

Domain and storefront already support installments:

| Layer | Behavior today |
|-------|----------------|
| DB | `store_settings.payway_installments int[]` (default `{1}`) |
| Public `settings.get` | Returns allow-list (legacy fallback if column missing) |
| Checkout | Select built from `settings.payway_installments` |
| `placeOrder` / quote | `assertInstallmentsAllowed` vs DB list (env `PAYWAY_INSTALLMENTS` only as config fallback) |
| Admin UI | **Missing** — `/admin/config` does not edit the field |
| `admin.settings.update` | **Missing** — input schema omits `payway_installments` |

`admin.settings.get` already `select("*")`, so the value is available once the UI reads it.

## Goal

Operators set which installment counts appear at checkout from the admin config page.

Non-goals:

- Changing Payway merchant / env keys from admin
- Per-product installment rules
- Interest / surcharge math (Payway hosted form owns display of bank plans)
- Free-form arbitrary counts outside a fixed common set (v1)

## UX

On `/admin/config`, near payment discount fields:

- Label: **Cuotas Payway permitidas**
- Control: fixed checkboxes for **1, 3, 6**
- Hint: options shown at checkout for tarjeta/Payway only; transfer/cash stay 1 cuota
- Validation: at least one option required; if the user unchecks all, save normalizes to `[1]` (same as `parseInstallmentsAllowList` empty → `[1]`)
- Display order: ascending after save

Existing values outside `{1,3,6}` (if any were set via SQL/env) are dropped on the next successful save.

**Load/save rule (explicit):**

1. Draft state is `number[]` of checked values from the fixed set.
2. On load: `checked = remote.payway_installments.filter(n => FIXED.includes(n))`; if empty after filter, default checked to `[1]`.
3. On save: send only the checked fixed options (normalized sorted unique ≥ 1). Do **not** preserve out-of-set values on save (operators opt into the fixed catalog).

## API

### `admin.settings.update`

Add optional input:

```ts
payway_installments?: number[] // each int ≥ 1
```

Server:

1. If present, run through `parseInstallmentsAllowList` (dedupe, sort, empty → `[1]`).
2. Intersect with fixed catalog `PAYWAY_INSTALLMENT_OPTIONS = [1, 3, 6]`. Drop unknowns + ensure non-empty (`[1]`).
3. Write `store_settings.payway_installments`.

No new migration. No change to public `settings.get` contract beyond already documented field.

### Contracts to update in the same change

- `docs/contracts/procedure-map.md` — add `payway_installments` to `admin.settings.update` input list
- Domain invariants already describe DB allow-list; no change required unless wording should mention admin UI

## Implementation surface

| File | Change |
|------|--------|
| `src/server/domain/checkout/installments.ts` | Export `PAYWAY_INSTALLMENT_OPTIONS` constant (or sibling); optional `normalizeAdminInstallments(input)` used by admin router |
| `src/server/trpc/routers/admin/settings.ts` | Zod + patch for `payway_installments` |
| `src/app/admin/config/page.tsx` | Draft field + checkbox group + include in mutate payload |
| Tests | Unit: normalizer; admin router or domain tests for empty/out-of-set |
| `docs/contracts/procedure-map.md` | Document field |

## Data flow

```text
Admin checks 1,3,6
  → admin.settings.update { payway_installments: [1,3,6] }
  → store_settings.payway_installments
  → settings.get / checkout select
  → placeOrder assertInstallmentsAllowed
```

Env `PAYWAY_INSTALLMENTS` remains fallback when DB list is empty/missing (existing behavior); once admin saves a non-empty list, DB wins.

## Errors

| Case | Behavior |
|------|----------|
| Empty array from client | Normalize to `[1]` |
| Values outside fixed set | Dropped on admin write |
| Non-integers / < 1 | Dropped by parse helper |
| Missing column on cloud (legacy) | Same pattern as prefill optional: if update fails on missing column, return clear message (optional hardening; column already applied in prod per OPS) |

## Testing

1. `parseInstallmentsAllowList` / admin normalizer: `[3,1,3,99,9]` → `[1,3]` when intersected with fixed set.
2. Empty → `[1]`.
3. Admin config page: checkboxes reflect get; save persists and refetch shows same selection.
4. Checkout still lists only allowed values (existing path; smoke if easy).

## Rollout

1. Deploy code (no schema change).
2. Operator opens Config → sets cuotas → Guardar.
3. Verify checkout select matches.

## Out of scope later

- Custom counts (CSV or free list) if merchant needs 2/4/18
- Admin preview of Payway bank installment interest

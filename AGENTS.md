# AGENTS.md — Activate Moda Deportiva

Instructions for **humans and AI agents** working in this repo. Read this before changing code.

## What this project is

E-commerce **backend** for Activate Moda Deportiva (AR sportswear): guest checkout, variant stock with 24h reservations, admin panel APIs, emails, payment proofs.

- **Product requirements (Spanish):** `docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`
- **Backend architecture (English):** `docs/superpowers/specs/2026-09-30-backend-architecture-design.md`
- **UI contracts (English):** `docs/contracts/`

Design mockups (Pencil): `design/ui-ux.pen`. HTML demos: `demos/` (not the production app).

## Ownership split

| Team | Owns | Does not own |
|------|------|----------------|
| **Backend (this codebase core)** | `src/server/**`, `src/app/api/**`, `supabase/**`, contracts, domain rules | Storefront pages, admin UI chrome, marketing CMS |
| **Frontend** | App Router pages/components that call tRPC | Inventing REST; recalculating chargeable totals; bypassing domain |

This is a **single Next.js monosystem**. Frontend consumes **tRPC** (`AppRouter`), not ad-hoc HTTP (except cron).

## Mandatory reading order (new agent)

1. This file (`AGENTS.md`)
2. `docs/contracts/domain-invariants.md` — money, stock, statuses, errors
3. `docs/contracts/procedure-map.md` — every procedure I/O
4. `docs/contracts/backend-for-frontend.md` — client setup, auth, examples
5. `README.md` — how to run locally
6. Only then: `src/server/domain/**` and `src/server/trpc/routers/**`

## Stack (locked)

| Piece | Choice |
|--------|--------|
| App | Next.js App Router (TypeScript) |
| API | tRPC + superjson at `/api/trpc` |
| DB / Auth / Storage | Supabase (local for dev/test) |
| Money | Integer **cents** |
| Email | Resend (or console if no key) |
| Jobs | Vercel Cron → `/api/cron/expire-reservations` |
| Package manager | **pnpm** |

When wiring libraries, prefer **current docs** (Context7 / official docs). Do not invent outdated APIs.

## Repo layout (backend)

```text
src/server/
  domain/          # business rules (pricing, checkout, orders, stock)
  db/              # Supabase service client + generated types
  trpc/            # routers + context + adminProcedure
  email/           # EmailPort + adapters
  storage/         # StoragePort + Supabase
  jobs/            # expire reservations CLI/wrapper
src/app/api/
  trpc/[trpc]/     # tRPC fetch adapter
  cron/…           # secured cron
supabase/
  migrations/      # source of truth for schema + RPCs
  seed.sql
docs/contracts/    # stable contract for UI team / their AI
```

**Rule:** Routers stay thin. Domain owns rules. SQL RPCs own multi-row atomic stock/order mutations (`place_order_tx`, `confirm_payment_tx`, `cancel_order_tx`).

## Hard invariants (do not break)

1. **Never trust client totals or prices.** Server recomputes via `quote` / `placeOrder`.
2. **Stock:** `available = stock_on_hand - active reservations`. Merge duplicate `variantId` lines before checks.
3. **Only published products** can be quoted/ordered.
4. **cash ⇒ pickup** only.
5. **andreani** requires `shippingAddress` with `line1`, `city`, `postalCode`.
6. **24h reservation** on `pendiente_pago`; expiry job cancels + releases stock.
7. **`orders.getByCode` must not return `access_token`.** Token only from `placeOrder` / email / `getByToken`.
8. **Payment proofs** path must be `payment-proofs/{orderId}/…` (use `createProofUploadUrl`).
9. **Stable domain error codes** (`STOCK_INSUFFICIENT`, `INVALID_TRANSITION`, …) — UI branches on `error.data.domainCode`.
10. **Code and comments in English.** Product copy / PRD may be Spanish.

## Local development

```bash
pnpm install
pnpm exec supabase start          # Docker required
# copy URL + keys from: pnpm exec supabase status  →  .env.local
# (ports may not be 54321 if another stack is running — use status output)
pnpm exec supabase db reset       # migrations + seed
pnpm test
pnpm dev
```

Env template: `.env.example`. Never commit `.env.local`.

Useful scripts: `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm jobs:expire`.

## Frontend integration cheat-sheet

- Type import: `import type { AppRouter } from "@/server/trpc/routers/app"`
- Client: `@trpc/client` + **superjson** (same as server)
- Public: catalog, settings, checkout, order tracking
- Admin: `Authorization: Bearer <supabase access_token>` + row in `admin_profiles`
- Details and examples: `docs/contracts/backend-for-frontend.md`

## What NOT to do

- Do not add Payway / Mercado Pago / buyer accounts in v1 (out of PRD scope).
- Do not put business rules only inside tRPC routers or React components.
- Do not open broad anon RLS write policies for orders; server uses **service role** after domain checks.
- Do not recalculate shipping/discount differently in the UI for charging.
- Do not expose `access_token` on code-only lookup.
- Do not skip tests for stock/checkout/order transitions when touching those paths.

## Commits & git (this team)

- Prefer **GPG-signed** commits: `git commit -S -m "…"`.
- Agents without TTY: stage changes and print the exact `git commit -S` command for a human.
- Branch/PR names describe the change (`fix/…`, `feat/…`), not plan step numbers.
- Do not commit secrets, `.env.local`, or `.worktrees/`.

## Testing expectations

- Unit: pricing, status machine, line merge, stock helpers.
- Integration (Supabase local): `placeOrder`, oversell, confirm/cancel, expire.
- After schema changes: new migration under `supabase/migrations/`, then `supabase db reset`, regenerate or update `src/server/db/types.ts` if RPCs/tables change.
- `pnpm test` and `pnpm build` should pass before claiming done.

## Seed / demo data

After `db reset`, seed includes category tree, one published product with variants, and `store_settings` (CBU alias, 10% discount bps, Andreani fee, free-shipping threshold). Use seed variant UUIDs from `supabase/seed.sql` in tests.

## Design / product artifacts

| Path | Use |
|------|-----|
| `docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md` | Product scope v1 |
| `design/ui-ux.pen` | UI design source |
| `demos/` | Clickable HTML prototypes only |
| `docs/LOGO*.png` | Brand assets |

## If you are an AI agent

- Prefer **editing domain + tests** over drive-by refactors.
- Prefer **Context7 / current docs** for Next, tRPC, Supabase, Zod.
- When adding a procedure: update `docs/contracts/procedure-map.md` and keep `AppRouter` export accurate.
- When changing money/stock/status rules: update `docs/contracts/domain-invariants.md` in the same change.
- Do not start large greenfield features outside the PRD without human confirmation.

## Quick “where is X?”

| Need | Look here |
|------|-----------|
| Totals math | `src/server/domain/pricing/calculate-totals.ts` |
| Place order | `src/server/domain/checkout/place-order.ts` + `supabase/migrations/*place_order*` |
| Status transitions | `src/server/domain/orders/status.ts`, `transitions.ts` |
| Expire 24h | `src/server/domain/orders/expire-reservations.ts` + cron route |
| Public API | `src/server/trpc/routers/*.ts` |
| Admin API | `src/server/trpc/routers/admin/*.ts` |
| Schema | `supabase/migrations/` |

---

*Keep this file short and accurate. Prefer linking to contracts over duplicating long tables.*

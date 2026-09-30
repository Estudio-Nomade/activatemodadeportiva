# Onboarding — next team / next AI

## You are joining…

**Activate Moda Deportiva**: a Next.js + Supabase + tRPC backend for a guest-checkout sportswear shop (Argentina). UI is built separately against the contracts below.

## Day-0 checklist

1. Install: Docker, Node 20+, pnpm.
2. Clone repo; read **`AGENTS.md`** (source of truth for agents).
3. `pnpm install`
4. `pnpm exec supabase start` → copy keys into `.env.local` from `supabase status` (see `.env.example`).
5. `pnpm exec supabase db reset`
6. `pnpm test` — expect all green.
7. `pnpm dev` — smoke `health` via tRPC if needed.

## Document map

| Doc | Audience | Purpose |
|-----|----------|---------|
| [`AGENTS.md`](../AGENTS.md) | Humans + AI | How to work in the repo |
| [`README.md`](../README.md) | Everyone | Run/dev commands |
| [`docs/contracts/backend-for-frontend.md`](./contracts/backend-for-frontend.md) | Frontend | Client setup, auth, examples |
| [`docs/contracts/procedure-map.md`](./contracts/procedure-map.md) | Frontend | Every tRPC procedure |
| [`docs/contracts/domain-invariants.md`](./contracts/domain-invariants.md) | Both | Money, stock, statuses, errors |
| [`docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`](./superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md) | Product | v1 scope (Spanish) |
| [`docs/superpowers/specs/2026-09-30-backend-architecture-design.md`](./superpowers/specs/2026-09-30-backend-architecture-design.md) | Backend | Architecture decisions |
| [`docs/superpowers/plans/2026-09-30-backend-implementation.md`](./superpowers/plans/2026-09-30-backend-implementation.md) | Historical | How backend was built |

## Frontend team starting point

1. Import `AppRouter` type from `src/server/trpc/routers/app.ts`.
2. Follow **backend-for-frontend** + **procedure-map**.
3. Never charge using client-side math — use `checkout.quote` / `placeOrder` results for display; server recomputes on place.
4. Admin: Supabase session access token + `admin_profiles` row.
5. Order tracking: prefer magic `token`; `getByCode` does **not** include `access_token`.

## Backend team starting point

1. Domain first under `src/server/domain/`.
2. Atomic stock/order changes → SQL migrations/RPCs, not multi-step client updates without locks.
3. Update contracts when procedure shapes or invariants change.
4. Tests required for checkout/stock/status paths.

## Out of scope (v1)

Payway/MP cards, buyer accounts, server-side cart table, home CMS, fine-grained admin roles — see PRD §2.2.

## Handoff status (as of harden commit)

- Backend core + hardening (merged lines, atomic confirm/cancel, tracking privacy, Andreani address, available stock, proof upload flow) is on `main`.
- UI implementation is the next major track.
- Design: `design/ui-ux.pen`; optional logo asset may still be untracked under `design/` or `docs/`.

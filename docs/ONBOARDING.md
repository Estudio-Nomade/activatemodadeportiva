# Onboarding — next team / next AI

## You are joining…

**Activate Moda Deportiva**: a Next.js monosystem (App Router + tRPC + Supabase) for guest-checkout sportswear (Argentina). **Backend core and storefront/admin FE baseline** live in this repo.

## Day-0 checklist

1. Install: Docker, Node 20+, pnpm.
2. Clone repo; read **`AGENTS.md`** (source of truth for agents).
3. `pnpm install`
4. `pnpm exec supabase start` → copy keys into `.env.local` from `supabase status` (see `.env.example`). Ports are **not** always 54321.
5. For Vitest against local Supabase, use **`.env.test.local`** (do not point unit/integration tests at cloud).
6. `pnpm exec supabase db reset`
7. `pnpm test` — expect all green.
8. `pnpm dev` — storefront at `/`, admin at `/admin/login`.

## Document map

| Doc | Audience | Purpose |
|-----|----------|---------|
| [`AGENTS.md`](../AGENTS.md) | Humans + AI | How to work in the repo |
| [`README.md`](../README.md) | Everyone | Run/dev commands |
| [`docs/FRONTEND-HANDOFF.md`](./FRONTEND-HANDOFF.md) | Frontend / agents | FE queue (T0–T13), tokens, pitfalls, % vs Pencil |
| [`docs/contracts/backend-for-frontend.md`](./contracts/backend-for-frontend.md) | Frontend | Client setup, auth, examples |
| [`docs/contracts/procedure-map.md`](./contracts/procedure-map.md) | Frontend | Every tRPC procedure |
| [`docs/contracts/domain-invariants.md`](./contracts/domain-invariants.md) | Both | Money, stock, statuses, errors |
| [`docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`](./superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md) | Product | v1 scope (Spanish) |
| [`docs/superpowers/specs/2026-09-30-backend-architecture-design.md`](./superpowers/specs/2026-09-30-backend-architecture-design.md) | Backend | Architecture decisions |
| [`docs/superpowers/plans/2026-09-30-backend-implementation.md`](./superpowers/plans/2026-09-30-backend-implementation.md) | Historical | How backend was built |

## Frontend

FE baseline is **in-repo** (not a separate app):

- Storefront: `/`, `/c/[slug]`, `/p/[slug]`, `/carrito`, `/checkout`, `/pedido`, `/buscar`, legales
- Admin: `/admin/*` (login, dashboard, pedidos, catálogo, config)
- Client libs: `src/lib/trpc`, `src/lib/cart`, `src/lib/format`, `src/components/store|admin`

Rules:

1. Import `AppRouter` from `src/server/trpc/routers/app.ts`.
2. Follow **backend-for-frontend** + **procedure-map**.
3. Never charge using client-side math — display `checkout.quote` / order `*_cents` only.
4. Admin: Supabase session access token + `admin_profiles` row (`Authorization: Bearer …`).
5. Order tracking: prefer magic `token`; `getByCode` does **not** include `access_token`.
6. Design SoT: `design/ui-ux.pen`. Work queue and visual gaps: **`docs/FRONTEND-HANDOFF.md`**.
7. Copy/UI strings: ES-AR. Code/comments: English.

## Backend team starting point

1. Domain first under `src/server/domain/`.
2. Atomic stock/order changes → SQL migrations/RPCs, not multi-step client updates without locks.
3. Update contracts when procedure shapes or invariants change.
4. Tests required for checkout/stock/status paths.

## Out of scope (v1)

Payway/MP cards, buyer accounts, server-side cart table, home CMS, fine-grained admin roles — see PRD §2.2.

## Handoff status

- Backend core + hardening is on `main` / baseline branch.
- FE scaffold + P0 partial is committed as **frontend baseline** (routes, PWA, cart, checkout, Photon, images, size guides, admin split).
- Remaining work is **polish and gaps** against Pencil (see handoff queue T1+), not greenfield UI.
- Design: `design/ui-ux.pen`; brand logo under `public/brand/`.

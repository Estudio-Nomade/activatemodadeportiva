# Activate Moda Deportiva

Next.js app with Supabase + tRPC backend for catalog, checkout, orders, admin, email, storage, and reservation expiry.

## Backend dev

1. `supabase start` (Docker required)
2. Copy keys from `supabase status` into `.env.local` (see `.env.example`)
3. `supabase db reset` (migrations + seed)
4. `pnpm install && pnpm dev`
5. `pnpm test`
6. `pnpm jobs:expire` — cancel expired `pendiente_pago` reservations (CLI)
7. Cron (Vercel): set `CRON_SECRET` in the Vercel project. Cron hits `GET|POST /api/cron/expire-reservations` with `Authorization: Bearer $CRON_SECRET` (see `vercel.json`, hourly). If `CRON_SECRET` is missing, the route returns 401.

Optional: set `RESEND_API_KEY` + `EMAIL_FROM` for real email; otherwise console logger.

Optional: `NEXT_PUBLIC_APP_URL` for magic links in emails.

## Hardening notes (stock / privacy)

- Cart lines with the same `variantId` are merged before stock checks.
- Andreani checkout requires a structured address.
- Payment proofs must live under `payment-proofs/{orderId}/` (use `orders.createProofUploadUrl`).

## Contracts (UI team)

- `docs/contracts/backend-for-frontend.md` — tRPC client, auth, examples
- `docs/contracts/procedure-map.md` — every procedure I/O
- `docs/contracts/domain-invariants.md` — totals, stock, status machine, errors

## Architecture

`docs/superpowers/specs/2026-09-30-backend-architecture-design.md`

Implementation plan: `docs/superpowers/plans/2026-09-30-backend-implementation.md`

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Next dev server |
| `pnpm test` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |
| `pnpm jobs:expire` | Run expire-reservations job once |

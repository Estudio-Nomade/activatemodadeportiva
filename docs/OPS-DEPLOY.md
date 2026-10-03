# Ops / deploy — Activate Moda Deportiva

Checklist post-T13 para cloud + Vercel. Actualizado 2026-10-02.

## Cloud Supabase (project `ujsrqqblhayumojskrow`)

From local `.env.local` (do not commit).

| Check | Status (2026-10-02) |
|-------|---------------------|
| Schema core (`store_settings`, `products`, RPCs) | Present (REST OK) |
| Seed product `calza-performance` | Present, published |
| `admin_profiles` | ≥1 row |
| Bucket `product-images` (public) | OK |
| Bucket `payment-proofs` (private) | OK |
| Bucket `size-guides` (public) | **Created via Storage API** |
| Table `size_guides` | Exists (empty; seed optional) |
| CLI `supabase link` | Not linked in this machine (listed org has **soleph**, different ref) |

### Migrations

Local source of truth: `supabase/migrations/` (incl. `20261001000000_size_guides_bucket.sql`).

If cloud was bootstrapped earlier without later migrations:

```bash
# Interactive: needs DB password + project link
pnpm exec supabase link --project-ref ujsrqqblhayumojskrow
pnpm exec supabase db push
```

Bucket `size-guides` can also be created in Dashboard → Storage (already done once via API).

### Admin user

1. Auth → Users → invite/create email user  
2. SQL: `insert into public.admin_profiles (user_id) values ('<auth-user-uuid>');`  
3. Login at `/admin/login`

Cloud already has at least one `admin_profiles` row.

---

## Env (Vercel Production + Preview)

| Var | Notes |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ujsrqqblhayumojskrow.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From project API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only; never expose to client |
| `NEXT_PUBLIC_APP_URL` | **Production site URL** (not localhost) |
| `RESEND_API_KEY` | **Missing in local `.env.local`** — set for real email |
| `EMAIL_FROM` | Verified domain in Resend (or `onboarding@resend.dev` for tests) |
| `CRON_SECRET` | Strong secret; must match Vercel Cron `Authorization: Bearer` |

Local `.env.local` snapshot (names only): Resend key empty; `EMAIL_FROM` default; `APP_URL` still localhost; `CRON_SECRET` set; Supabase keys present.

`vercel.json` already schedules:

```json
{ "path": "/api/cron/expire-reservations", "schedule": "0 * * * *" }
```

---

## Git / deploy

```bash
# 1) Commit staged T13 fix (GPG on your machine)
git commit -S -m "$(cat <<'EOF'
fix: cache cart getSnapshot to stop useSyncExternalStore loop

T13 smoke hit an infinite update loop because getSnapshot re-parsed
localStorage every call. Cache memoryLines, surface STOCK_INSUFFICIENT
on checkout quote errors, and record full QA results in the handoff.
EOF
)"

# 2) Push branch + PR
git push -u origin feat/frontend-baseline
gh pr create --base main --head feat/frontend-baseline \
  --title "feat: frontend baseline + T13 QA fixes" \
  --body "Storefront/admin FE (T0–T13), cart getSnapshot fix, smoke QA notes. See docs/FRONTEND-HANDOFF.md and docs/OPS-DEPLOY.md."

# 3) Merge → Vercel production; set env vars above; verify cron + one real order email
```

This agent could **not** run `git commit -S` (no GPG secret key) nor Vercel CLI (`Not authorized` / stale `.vercel` link).

---

## Post-deploy smoke (prod)

1. Home → cat → PDP → cart → transfer+Andreani → éxito → proof upload  
2. cash+pickup; cash blocked under Andreani  
3. Oversell → stock message  
4. Admin login → confirm payment on proof → timeline advances  
5. Admin: product + image + size guide + publish  
6. Mailpit/Resend: order email  
7. Wait for cron hour or `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/expire-reservations`

---

## Out of scope v1

Payway/MP, buyer accounts, server cart, rich home CMS, fine-grained admin roles.

# Ops / deploy — Activate Moda Deportiva

Checklist cloud + GitHub + Vercel. Actualizado **2026-10-09**.

**Dominio de producción:** `https://activatemodadeportiva.com`  
(`www` opcional; `NEXT_PUBLIC_APP_URL` debe ser el canónico sin slash final.)

---

## Cloud Supabase (project `ujsrqqblhayumojskrow`)

URL: `https://ujsrqqblhayumojskrow.supabase.co`  
JWT `ref` must be **`ujsrqqbl…` (double q)**.

### Audit 2026-10-09 (service_role REST)

| Check | Status |
|-------|--------|
| Core tables + categories (21) | OK |
| Buckets `product-images` (public), `payment-proofs` (private), `size-guides` (public) | OK |
| Payway migration (`payway` enum, order cols, `payway_webhook_events`, `store_settings.payway_installments`) | **OK (applied)** |
| RPC `place_order_tx` / confirm / cancel | OK (prior audit) |
| Published products | **1** (seed — load real catalog post-deploy via admin) |
| `admin_profiles` | **0 rows — BLOCKER** |
| Auth users | **0 — BLOCKER** (create admin before go-live) |
| Instagram | set |
| WhatsApp phone | **empty** (admin Config post-deploy) |
| CBU/alias text | set (editable in admin anytime) |

**Do not re-run** full `scripts/cloud-bootstrap.sql` if tables already exist (`42P07`).

Payway SQL (only if a fresh empty project): `supabase/migrations/20261006120000_payway_checkout.sql` in SQL Editor.

### Admin user (required before useful admin)

1. Supabase Dashboard → Authentication → Users → **Add user** (email + password), confirm email if required.
2. SQL Editor:

```sql
insert into public.admin_profiles (user_id)
values ('<auth-user-uuid>')
on conflict do nothing;
```

3. Login: `https://activatemodadeportiva.com/admin/login`

---

## Env — Vercel Production

Team / project: **`activatemodadeportiva`** (not personal scopes).

| Var | Production value |
|-----|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ujsrqqblhayumojskrow.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (never `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_APP_URL` | **`https://activatemodadeportiva.com`** |
| `CRON_SECRET` | strong random (same value Vercel Cron will send) |
| `EMAIL_FROM` | `Activate <noreply@activatemodadeportiva.com>` (domain verified in Resend) |
| `RESEND_API_KEY` | production key |
| `PAYWAY_PUBLIC_KEY` | from Payway |
| `PAYWAY_PRIVATE_KEY` | from Payway |
| `PAYWAY_SITE_ID` | from Payway |
| `PAYWAY_ENV` | `production` (or `developer` until live keys) |
| `PAYWAY_TEMPLATE_ID` | usually `1` |
| `PAYWAY_INSTALLMENTS` | e.g. `1` (fallback; admin can set allow-list in DB) |

Optional: `PAYWAY_GROUPER`, `PAYWAY_DEVELOPER` (defaults exist in code).

### Cron

`vercel.json`: daily `0 3 * * *` → `/api/cron/expire-reservations`  
Vercel sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set.

Manual:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://activatemodadeportiva.com/api/cron/expire-reservations
```

### Payway panel

Webhook / notification URL:

`https://activatemodadeportiva.com/api/payway/notifications`

Success/cancel return URLs should align with app (`/pedido/exito` and order token links use `NEXT_PUBLIC_APP_URL`).

---

## Domain / DNS

1. Vercel project → Domains → add `activatemodadeportiva.com` (+ `www` if desired).
2. At registrar: records Vercel shows (usually A/CNAME).
3. After SSL green: set `NEXT_PUBLIC_APP_URL=https://activatemodadeportiva.com` and **redeploy**.
4. Resend: verify domain `activatemodadeportiva.com` for `EMAIL_FROM`.

---

## Git / local before deploy

```bash
# Local hygiene (this machine)
# .gitignore must include .codegraph/ (Turbopack breaks on daemon.sock)
git add .gitignore .env.example docs/OPS-DEPLOY.md
git commit -S -m "chore(ops): prod domain checklist, ignore .codegraph"
git push origin main
```

Production deploys from `main` if Git integration is linked to team project.

**CLI pitfall:** personal Vercel login may not see team `activatemodadeportiva`. Use Dashboard or a **team token**.

---

## Ordered go-live (who does what)

| # | Step | Who |
|---|------|-----|
| 1 | Commit/push ops fixes (gitignore, docs) | Dev |
| 2 | Create Auth admin user + `admin_profiles` row | Human (Dashboard) |
| 3 | Vercel: domain `activatemodadeportiva.com` + DNS | Human |
| 4 | Vercel env: `NEXT_PUBLIC_APP_URL` + Payway + Resend + `CRON_SECRET` | Human |
| 5 | Deploy production (`main` or `vercel --prod`) | Human / CI |
| 6 | Payway webhook URL → prod notifications route | Human |
| 7 | Smoke: home → checkout transfer; admin login; cron curl | Dev/Human |
| 8 | Smoke Payway (if keys live) | Human |
| 9 | Admin: CBU, WA, shipping, real catalog | Business (post-deploy OK) |

---

## Post-deploy smoke

1. `https://activatemodadeportiva.com` loads HTTPS  
2. Home → cat → PDP → cart → transfer → éxito → proof upload  
3. cash + pickup only; cash blocked with Andreani  
4. Admin login → confirm payment  
5. Admin: product + image + publish  
6. Cron with `CRON_SECRET`  
7. Payway card (if configured) → order leaves `pendiente_pago`  
8. Email received (Resend) or accept console until domain verified  

---

## Not blockers for first deploy

- Real product catalog volume  
- Final CBU/alias copy (admin Config)  
- WhatsApp number  
- Custom home CMS  
- Buyer accounts  

## Out of scope still

Mercado Pago, fine-grained admin roles, native app.

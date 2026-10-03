# Ops / deploy — Activate Moda Deportiva

Checklist cloud + GitHub + Vercel. Actualizado 2026-10-03.

## Cloud Supabase (project `ujsrqqblhayumojskrow`)

URL: `https://ujsrqqblhayumojskrow.supabase.co`  
JWT `ref` must be **`ujsrqqbl…` (double q)**.

### Audit 2026-10-03 (service_role REST)

| Check | Status |
|-------|--------|
| Core tables (`store_settings`, `categories`×21, `products`, variants, orders, …) | OK |
| `size_guides` + seed Magher/Sox | OK |
| `admin_profiles` | 1 row |
| `categories.composition_care_text` | OK |
| `store_settings.whatsapp_prefill_message` | OK |
| WhatsApp phone saved (digits) | `5492494639582` |
| Instagram | official URL set |
| Buckets `product-images` (public), `payment-proofs` (private), `size-guides` (public) | OK |
| RPC `place_order_tx(p jsonb)` | OK (domain VALIDATION on empty) |
| RPC `confirm_payment_tx(p_order_id)` | OK (ORDER_NOT_FOUND on fake id) |
| RPC `cancel_order_tx(p_order_id, p_reason)` | OK (enum validation) |
| Published product `calza-performance` | OK |

**No missing migrations for current app code.** Incremental SQL already applied:
- `20261003120000_category_composition_care.sql`
- `20261004120000_whatsapp_prefill_message.sql`

Full rebuild only if empty project: paste `scripts/cloud-bootstrap.sql` in SQL Editor  
(https://supabase.com/dashboard/project/ujsrqqblhayumojskrow/sql/new).  
If you see `42P07 already exists` → schema is there; **do not re-run full bootstrap**.

### Admin user

1. Auth user exists (cloud email often `activate.deportiva.2025@gmail.com`)
2. `admin_profiles` already has ≥1 row
3. Login `/admin/login` with that Auth password

### Optional polish (not blockers)

- Fill `contact_address` in admin Config
- Set `whatsapp_prefill_message` (e.g. ¡Hola! Quiero consultar sobre una prenda)
- `RESEND_API_KEY` for real order emails (without it, emails log to console)

---

## Env — Vercel Production + Preview + Development

Team / scope: **`activatemodadeportiva`** (project `prj_Y3Y72lOxoKIhdNpbxNbunly7jtJs`).  
**Not** personal `martiyaquintas-projects`.

| Var | Notes |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ujsrqqblhayumojskrow.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon JWT (ref `ujsrqqbl…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role only; never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | **Production public URL** (e.g. `https://activatemodadeportiva.vercel.app` or custom domain). Dev target = `http://localhost:3000` |
| `CRON_SECRET` | strong random; cron sends `Authorization: Bearer …` |
| `EMAIL_FROM` | verified Resend sender or `onboarding@resend.dev` |
| `RESEND_API_KEY` | optional until real email |

`vercel.json` cron:

```json
{ "path": "/api/cron/expire-reservations", "schedule": "0 * * * *" }
```

### Local `.env.local` (2026-10-03 names only)

- Supabase URL + anon + service_role: set (cloud)
- `NEXT_PUBLIC_APP_URL`: localhost (correct for local)
- `CRON_SECRET`: set
- `EMAIL_FROM`: set
- `RESEND_API_KEY`: **missing**

### Agent / CLI pitfall (this machine)

Logged-in Vercel CLI token is user **`estudionomade`** and only sees team **`martiyaquintas-projects`**.  
API calls with `teamId=team_1KHvonmfaCh3zuxIYXFUTNR1` (Activate) return **forbidden**.

**Human must** either:

1. Log in to Vercel as a member of team `activatemodadeportiva` and run deploy, **or**
2. Create a **team token** on that team and:

```bash
export VERCEL_TOKEN=…   # team token for activatemodadeportiva
vercel link --yes --scope activatemodadeportiva --project activatemodadeportiva
vercel env ls --scope activatemodadeportiva
# set missing env via Dashboard or API (Preview often needs REST — CLI asks Git branch)
vercel --prod --scope activatemodadeportiva
```

`vercel link` can overwrite `.env.local` — re-merge cloud keys after link; keep local `APP_URL=http://localhost:3000`.

---

## Git / deploy status

| Item | Status |
|------|--------|
| Remote | `https://github.com/Estudio-Nomade/activatemodadeportiva.git` |
| Branch pushed | `feat/product-card-hover-lift` |
| PR | https://github.com/Estudio-Nomade/activatemodadeportiva/pull/1 |
| Base | `main` |

```bash
# After review:
gh pr merge 1 --merge
# If Vercel Git integration is connected to the team project, Production deploys from main.
# Else: vercel --prod from a machine with team auth.
```

---

## Post-deploy smoke (prod)

1. Home → cat → PDP → cart → transfer + Andreani → éxito → proof upload  
2. cash + pickup only; cash blocked with Andreani  
3. Oversell → stock message  
4. Admin login → confirm payment → timeline  
5. Admin: product + image + size guide + publish  
6. Footer WA opens chat to configured number (+ optional prefill); IG opens profile  
7. Email (if Resend set) or console fallback  
8. Cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/expire-reservations`

---

## Out of scope v1

Payway/MP, buyer accounts, server cart, rich home CMS, fine-grained admin roles.

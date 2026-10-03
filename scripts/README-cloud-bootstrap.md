# Cloud bootstrap — Activate Moda Deportiva

Project ref: `ujsrqqblhayumojskrow`  
URL: `https://ujsrqqblhayumojskrow.supabase.co`

## Why
Cloud project is empty (no tables). CLI account on this machine only sees Soleph orgs, so `supabase link/db push` cannot run against Activate.

## Apply schema (once)

1. Open: https://supabase.com/dashboard/project/ujsrqqblhayumojskrow/sql/new
2. Paste contents of `scripts/cloud-bootstrap.sql` (migrations + seed)
3. Run
4. Confirm Table Editor has `store_settings`, `categories`, `products`, …

## Env

`.env.local` must use:

```
NEXT_PUBLIC_SUPABASE_URL=https://ujsrqqblhayumojskrow.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon jwt>
SUPABASE_SERVICE_ROLE_KEY=<service_role jwt>
```

Note: JWT `ref` is `ujsrqqbl…` (double **q**). Host `ujsrqbl…` (one q) does not resolve.

## After bootstrap

```bash
pnpm test
pnpm dev
```

## Admin user

Create Auth user in dashboard, then:

```sql
insert into public.admin_profiles (user_id)
values ('<auth-user-uuid>');
```

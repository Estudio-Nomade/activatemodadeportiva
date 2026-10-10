-- Admin Web Push subscriptions (service role via tRPC only)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index push_subscriptions_admin_user_id_idx
  on public.push_subscriptions (admin_user_id);

alter table public.push_subscriptions enable row level security;

-- No direct client access; server uses service role after adminProcedure
create policy push_subscriptions_deny_all on public.push_subscriptions
  for all using (false) with check (false);

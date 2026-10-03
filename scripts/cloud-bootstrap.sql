-- ===== 20260930000000_init.sql =====
-- Activate v1 schema
create extension if not exists "pgcrypto";

create table public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories (id) on delete restrict,
  sort_order int not null default 0
);

create table public.size_guides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid not null references public.categories (id) on delete restrict,
  list_price_cents int not null check (list_price_cents >= 0),
  promo_price_cents int check (promo_price_cents is null or promo_price_cents >= 0),
  size_guide_id uuid references public.size_guides (id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  alt text not null default ''
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color text not null,
  size text not null,
  stock_on_hand int not null default 0 check (stock_on_hand >= 0),
  unique (product_id, color, size)
);

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  transfer_cbu_alias_text text not null default '',
  payment_discount_bps int not null default 1000 check (payment_discount_bps >= 0),
  andreani_fee_cents int not null default 0 check (andreani_fee_cents >= 0),
  free_shipping_threshold_cents int not null default 0 check (free_shipping_threshold_cents >= 0),
  season_label text not null default 'Moda deportiva',
  whatsapp_url_or_phone text not null default '',
  whatsapp_prefill_message text not null default '',
  instagram_url text not null default '',
  contact_email text not null default '',
  contact_address text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1);

create type public.order_status as enum (
  'pendiente_pago',
  'pago_confirmado',
  'preparando',
  'listo_retiro',
  'enviado',
  'entregado',
  'cancelado'
);

create type public.shipping_method as enum ('pickup', 'andreani');
create type public.payment_method as enum ('transfer', 'cash');
create type public.cancel_reason as enum ('admin', 'expired');
create type public.reservation_status as enum ('active', 'consumed', 'released');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  access_token text not null unique,
  status public.order_status not null default 'pendiente_pago',
  customer_name text not null,
  phone text not null,
  email text not null,
  shipping_method public.shipping_method not null,
  payment_method public.payment_method not null,
  subtotal_cents int not null check (subtotal_cents >= 0),
  discount_cents int not null check (discount_cents >= 0),
  shipping_cents int not null check (shipping_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  shipping_address jsonb,
  reservation_expires_at timestamptz,
  cancel_reason public.cancel_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint cash_requires_pickup check (
    payment_method <> 'cash' or shipping_method = 'pickup'
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  color text not null,
  size text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  qty int not null check (qty > 0)
);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  qty int not null check (qty > 0),
  expires_at timestamptz not null,
  status public.reservation_status not null default 'active'
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index orders_code_idx on public.orders (code);
create index orders_access_token_idx on public.orders (access_token);
create index stock_reservations_active_expires_idx
  on public.stock_reservations (expires_at)
  where status = 'active';
create index products_name_idx on public.products using gin (to_tsvector('simple', name));
create index product_variants_product_id_idx on public.product_variants (product_id);

alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.store_settings enable row level security;
alter table public.size_guides enable row level security;

-- ===== 20260930000001_place_order_tx.sql =====
-- Atomic place order: lock variants, check stock, insert order/items/reservations
create or replace function public.place_order_tx(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line jsonb;
  v_variant_id uuid;
  v_qty int;
  v_on_hand int;
  v_reserved int;
  v_available int;
  v_order_id uuid;
  v_expires_at timestamptz;
  v_item jsonb;
  v_result jsonb;
begin
  if p is null then
    raise exception 'STOCK_INSUFFICIENT' using errcode = 'P0001';
  end if;

  v_expires_at := coalesce((p->>'reservation_expires_at')::timestamptz, now() + interval '24 hours');

  -- Lock and validate stock for each line
  for v_line in select * from jsonb_array_elements(p->'lines')
  loop
    v_variant_id := (v_line->>'variant_id')::uuid;
    v_qty := (v_line->>'qty')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'STOCK_INSUFFICIENT' using errcode = 'P0001';
    end if;

    select stock_on_hand into v_on_hand
    from public.product_variants
    where id = v_variant_id
    for update;

    if not found then
      raise exception 'STOCK_INSUFFICIENT' using errcode = 'P0001';
    end if;

    select coalesce(sum(qty), 0) into v_reserved
    from public.stock_reservations
    where variant_id = v_variant_id
      and status = 'active';

    v_available := v_on_hand - v_reserved;
    if v_qty > v_available then
      raise exception 'STOCK_INSUFFICIENT' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.orders (
    code,
    access_token,
    status,
    customer_name,
    phone,
    email,
    shipping_method,
    payment_method,
    subtotal_cents,
    discount_cents,
    shipping_cents,
    total_cents,
    shipping_address,
    reservation_expires_at
  ) values (
    p->>'code',
    p->>'access_token',
    'pendiente_pago',
    p->>'customer_name',
    p->>'phone',
    p->>'email',
    (p->>'shipping_method')::public.shipping_method,
    (p->>'payment_method')::public.payment_method,
    (p->>'subtotal_cents')::int,
    (p->>'discount_cents')::int,
    (p->>'shipping_cents')::int,
    (p->>'total_cents')::int,
    case
      when p->'shipping_address' is null or p->'shipping_address' = 'null'::jsonb then null
      else p->'shipping_address'
    end,
    v_expires_at
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p->'items')
  loop
    insert into public.order_items (
      order_id,
      variant_id,
      product_name,
      color,
      size,
      unit_price_cents,
      qty
    ) values (
      v_order_id,
      (v_item->>'variant_id')::uuid,
      v_item->>'product_name',
      v_item->>'color',
      v_item->>'size',
      (v_item->>'unit_price_cents')::int,
      (v_item->>'qty')::int
    );

    insert into public.stock_reservations (
      order_id,
      variant_id,
      qty,
      expires_at,
      status
    ) values (
      v_order_id,
      (v_item->>'variant_id')::uuid,
      (v_item->>'qty')::int,
      v_expires_at,
      'active'
    );
  end loop;

  select to_jsonb(o.*) into v_result
  from public.orders o
  where o.id = v_order_id;

  return v_result;
end;
$$;

revoke all on function public.place_order_tx(jsonb) from public;
grant execute on function public.place_order_tx(jsonb) to service_role;

-- ===== 20260930000002_storage_buckets.sql =====
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- ===== 20260930000003_stock_and_order_rpcs.sql =====
-- Harden place_order_tx (merge lines) + atomic confirm/cancel

create or replace function public.place_order_tx(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line jsonb;
  v_variant_id uuid;
  v_qty int;
  v_on_hand int;
  v_reserved int;
  v_available int;
  v_order_id uuid;
  v_expires_at timestamptz;
  v_item jsonb;
  v_result jsonb;
  v_merged jsonb := '{}'::jsonb;
  v_key text;
begin
  if p is null then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  v_expires_at := coalesce((p->>'reservation_expires_at')::timestamptz, now() + interval '24 hours');

  -- Merge lines by variant_id (sum qty) to prevent split-line oversell
  for v_line in select * from jsonb_array_elements(coalesce(p->'lines', '[]'::jsonb))
  loop
    v_variant_id := (v_line->>'variant_id')::uuid;
    v_qty := (v_line->>'qty')::int;
    if v_variant_id is null or v_qty is null or v_qty <= 0 then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;
    v_key := v_variant_id::text;
    v_merged := jsonb_set(
      v_merged,
      array[v_key],
      to_jsonb(coalesce((v_merged->>v_key)::int, 0) + v_qty)
    );
  end loop;

  if v_merged = '{}'::jsonb then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  for v_key, v_line in select * from jsonb_each(v_merged)
  loop
    v_variant_id := v_key::uuid;
    v_qty := (v_line#>>'{}')::int;

    select stock_on_hand into v_on_hand
    from public.product_variants
    where id = v_variant_id
    for update;

    if not found then
      raise exception 'STOCK_INSUFFICIENT' using errcode = 'P0001';
    end if;

    select coalesce(sum(qty), 0) into v_reserved
    from public.stock_reservations
    where variant_id = v_variant_id
      and status = 'active';

    v_available := v_on_hand - v_reserved;
    if v_qty > v_available then
      raise exception 'STOCK_INSUFFICIENT' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.orders (
    code,
    access_token,
    status,
    customer_name,
    phone,
    email,
    shipping_method,
    payment_method,
    subtotal_cents,
    discount_cents,
    shipping_cents,
    total_cents,
    shipping_address,
    reservation_expires_at
  ) values (
    p->>'code',
    p->>'access_token',
    'pendiente_pago',
    p->>'customer_name',
    p->>'phone',
    p->>'email',
    (p->>'shipping_method')::public.shipping_method,
    (p->>'payment_method')::public.payment_method,
    (p->>'subtotal_cents')::int,
    (p->>'discount_cents')::int,
    (p->>'shipping_cents')::int,
    (p->>'total_cents')::int,
    case
      when p->'shipping_address' is null or p->'shipping_address' = 'null'::jsonb then null
      else p->'shipping_address'
    end,
    v_expires_at
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb))
  loop
    insert into public.order_items (
      order_id,
      variant_id,
      product_name,
      color,
      size,
      unit_price_cents,
      qty
    ) values (
      v_order_id,
      (v_item->>'variant_id')::uuid,
      v_item->>'product_name',
      v_item->>'color',
      v_item->>'size',
      (v_item->>'unit_price_cents')::int,
      (v_item->>'qty')::int
    );

    insert into public.stock_reservations (
      order_id,
      variant_id,
      qty,
      expires_at,
      status
    ) values (
      v_order_id,
      (v_item->>'variant_id')::uuid,
      (v_item->>'qty')::int,
      v_expires_at,
      'active'
    );
  end loop;

  select to_jsonb(o.*) into v_result
  from public.orders o
  where o.id = v_order_id;

  return v_result;
end;
$$;

revoke all on function public.place_order_tx(jsonb) from public;
grant execute on function public.place_order_tx(jsonb) to service_role;

-- Confirm payment: consume active reservations and decrease on_hand atomically
create or replace function public.confirm_payment_tx(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_res record;
  v_on_hand int;
begin
  select status into v_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_status is distinct from 'pendiente_pago' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  for v_res in
    select id, variant_id, qty
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'active'
    for update
  loop
    select stock_on_hand into v_on_hand
    from public.product_variants
    where id = v_res.variant_id
    for update;

    if not found then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;

    if v_on_hand < v_res.qty then
      raise exception 'STOCK_INSUFFICIENT' using errcode = 'P0001';
    end if;

    update public.product_variants
    set stock_on_hand = stock_on_hand - v_res.qty
    where id = v_res.variant_id;

    update public.stock_reservations
    set status = 'consumed'
    where id = v_res.id
      and status = 'active';
  end loop;

  update public.orders
  set status = 'pago_confirmado',
      updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.confirm_payment_tx(uuid) from public;
grant execute on function public.confirm_payment_tx(uuid) to service_role;

-- Cancel order: release active or restore consumed stock
create or replace function public.cancel_order_tx(p_order_id uuid, p_reason public.cancel_reason)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_res record;
begin
  select status into v_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_status = 'entregado' or v_status = 'cancelado' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  for v_res in
    select id, variant_id, qty, status
    from public.stock_reservations
    where order_id = p_order_id
      and status in ('active', 'consumed')
    for update
  loop
    if v_res.status = 'consumed' then
      perform 1 from public.product_variants where id = v_res.variant_id for update;
      update public.product_variants
      set stock_on_hand = stock_on_hand + v_res.qty
      where id = v_res.variant_id;
    end if;

    update public.stock_reservations
    set status = 'released'
    where id = v_res.id
      and status = v_res.status;
  end loop;

  update public.orders
  set status = 'cancelado',
      cancel_reason = p_reason,
      cancelled_at = now(),
      reservation_expires_at = null,
      updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.cancel_order_tx(uuid, public.cancel_reason) from public;
grant execute on function public.cancel_order_tx(uuid, public.cancel_reason) to service_role;

-- ===== seed.sql =====
-- Category tree (PRD) + sample product + store settings

-- Top-level categories
insert into public.categories (id, slug, name, parent_id, sort_order) values
  ('11111111-1111-4111-a111-111111111001', 'mujer', 'Mujer', null, 1),
  ('11111111-1111-4111-a111-111111111002', 'hombre', 'Hombre', null, 2),
  ('11111111-1111-4111-a111-111111111003', 'accesorios', 'Accesorios', null, 3);

-- Mujer leaves
insert into public.categories (id, slug, name, parent_id, sort_order) values
  ('11111111-1111-4111-a111-111111111011', 'mujer-calzas-largas', 'Calzas largas', '11111111-1111-4111-a111-111111111001', 1),
  ('11111111-1111-4111-a111-111111111012', 'mujer-shorts', 'Shorts', '11111111-1111-4111-a111-111111111001', 2),
  ('11111111-1111-4111-a111-111111111013', 'mujer-tops', 'Tops', '11111111-1111-4111-a111-111111111001', 3),
  ('11111111-1111-4111-a111-111111111014', 'mujer-remeras', 'Remeras', '11111111-1111-4111-a111-111111111001', 4),
  ('11111111-1111-4111-a111-111111111015', 'mujer-buzos-camperas', 'Buzos / Camperas', '11111111-1111-4111-a111-111111111001', 5),
  ('11111111-1111-4111-a111-111111111016', 'mujer-conjuntos', 'Conjuntos', '11111111-1111-4111-a111-111111111001', 6);

-- Hombre leaves
insert into public.categories (id, slug, name, parent_id, sort_order) values
  ('11111111-1111-4111-a111-111111111021', 'hombre-remeras', 'Remeras', '11111111-1111-4111-a111-111111111002', 1),
  ('11111111-1111-4111-a111-111111111022', 'hombre-shorts', 'Shorts', '11111111-1111-4111-a111-111111111002', 2),
  ('11111111-1111-4111-a111-111111111023', 'hombre-pantalon', 'Pantalón', '11111111-1111-4111-a111-111111111002', 3),
  ('11111111-1111-4111-a111-111111111024', 'hombre-buzos-camperas', 'Buzos / Camperas', '11111111-1111-4111-a111-111111111002', 4),
  ('11111111-1111-4111-a111-111111111025', 'hombre-conjuntos', 'Conjuntos', '11111111-1111-4111-a111-111111111002', 5);

-- Accesorios leaves
insert into public.categories (id, slug, name, parent_id, sort_order) values
  ('11111111-1111-4111-a111-111111111031', 'accesorios-medias', 'Medias', '11111111-1111-4111-a111-111111111003', 1),
  ('11111111-1111-4111-a111-111111111032', 'accesorios-bolsos', 'Bolsos', '11111111-1111-4111-a111-111111111003', 2),
  ('11111111-1111-4111-a111-111111111033', 'accesorios-botellas', 'Botellas', '11111111-1111-4111-a111-111111111003', 3),
  ('11111111-1111-4111-a111-111111111034', 'accesorios-gorras', 'Gorras', '11111111-1111-4111-a111-111111111003', 4),
  ('11111111-1111-4111-a111-111111111035', 'accesorios-futbol', 'Fútbol', '11111111-1111-4111-a111-111111111003', 5),
  ('11111111-1111-4111-a111-111111111036', 'accesorios-hockey', 'Hockey', '11111111-1111-4111-a111-111111111003', 6),
  ('11111111-1111-4111-a111-111111111037', 'accesorios-natacion', 'Natación', '11111111-1111-4111-a111-111111111003', 7);

-- Sample published product with two variants (stock 5 each)
insert into public.products (
  id, name, slug, description, category_id,
  list_price_cents, promo_price_cents, is_published
) values (
  '22222222-2222-4222-a222-222222222001',
  'Calza Performance',
  'calza-performance',
  'Calza deportiva de alto rendimiento',
  '11111111-1111-4111-a111-111111111011',
  4500000,
  null,
  true
);

insert into public.product_variants (id, product_id, color, size, stock_on_hand) values
  ('33333333-3333-4333-a333-333333333001', '22222222-2222-4222-a222-222222222001', 'Negro', 'M', 5),
  ('33333333-3333-4333-a333-333333333002', '22222222-2222-4222-a222-222222222001', 'Negro', 'L', 5);

-- Store settings overrides
update public.store_settings set
  transfer_cbu_alias_text = 'activate.moda.mp',
  payment_discount_bps = 1000,
  andreani_fee_cents = 450000,
  free_shipping_threshold_cents = 8000000,
  season_label = 'Moda deportiva',
  whatsapp_prefill_message = '¡Hola! Quiero consultar sobre una prenda'
where id = 1;


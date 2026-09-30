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

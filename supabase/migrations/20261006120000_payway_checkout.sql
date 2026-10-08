-- Payway hosted checkout: enum, order fields, settings, webhook log, place_order_tx

alter type public.payment_method add value if not exists 'payway';

alter table public.orders
  add column if not exists installments int not null default 1
    constraint orders_installments_positive check (installments >= 1),
  add column if not exists payway_site_transaction_id text null,
  add column if not exists payway_payment_id text null,
  add column if not exists payway_link_attempt int not null default 0;

alter table public.store_settings
  add column if not exists payway_installments int[] not null default '{1}';

create table if not exists public.payway_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  payload jsonb not null,
  order_id uuid null references public.orders(id),
  processed_at timestamptz null,
  error text null
);

alter table public.payway_webhook_events enable row level security;

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
  v_installments int;
begin
  if p is null then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  v_expires_at := coalesce((p->>'reservation_expires_at')::timestamptz, now() + interval '24 hours');
  v_installments := coalesce((p->>'installments')::int, 1);
  if v_installments is null or v_installments < 1 then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

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
    reservation_expires_at,
    installments,
    payway_site_transaction_id
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
    v_expires_at,
    v_installments,
    nullif(p->>'payway_site_transaction_id', '')
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
      qty,
      sku
    ) values (
      v_order_id,
      (v_item->>'variant_id')::uuid,
      v_item->>'product_name',
      v_item->>'color',
      v_item->>'size',
      (v_item->>'unit_price_cents')::int,
      (v_item->>'qty')::int,
      nullif(trim(coalesce(v_item->>'sku', '')), '')
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

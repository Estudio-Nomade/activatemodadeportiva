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

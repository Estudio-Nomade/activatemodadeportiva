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

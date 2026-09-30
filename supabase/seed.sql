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
  season_label = 'Moda deportiva'
where id = 1;

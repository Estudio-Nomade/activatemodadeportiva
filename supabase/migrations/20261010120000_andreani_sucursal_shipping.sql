-- Andreani to branch/sucursal (same fee rules as home; distinct method for admin/UI)
alter type public.shipping_method add value if not exists 'andreani_sucursal';

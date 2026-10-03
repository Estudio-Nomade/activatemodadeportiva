-- Leaf-category composition & care copy for PDP accordion (admin-editable).
alter table public.categories
  add column if not exists composition_care_text text not null default '';

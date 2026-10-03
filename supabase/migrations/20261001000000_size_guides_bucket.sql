-- Public bucket for admin-uploaded size guide images (seed may still use /public paths).
insert into storage.buckets (id, name, public)
values ('size-guides', 'size-guides', true)
on conflict (id) do nothing;

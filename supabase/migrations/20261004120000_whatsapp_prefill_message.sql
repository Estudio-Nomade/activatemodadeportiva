-- Prefill text for storefront WhatsApp deep links (footer, FAB, contacto).
alter table public.store_settings
  add column if not exists whatsapp_prefill_message text not null default '';

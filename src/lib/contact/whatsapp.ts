/** Build WhatsApp open URL from settings value (full URL or phone). */
export function whatsappHref(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

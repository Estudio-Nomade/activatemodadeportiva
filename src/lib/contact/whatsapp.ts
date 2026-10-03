/** Normalize admin phone/URL into a clickable WhatsApp deep link. */
export function whatsappHref(
  value: string | null | undefined,
  prefillMessage?: string | null,
): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  let base: string | null = null;

  if (/^https?:\/\//i.test(raw)) {
    base = raw;
  } else if (/^(wa\.me|api\.whatsapp\.com)\//i.test(raw)) {
    base = `https://${raw}`;
  } else {
    let digits = raw.replace(/[^\d]/g, "");
    if (!digits) return null;
    // international 00… → drop prefix
    digits = digits.replace(/^00+/, "");
    // AR local land/mobile without country (10 digits) → +54
    if (digits.length === 10) digits = `54${digits}`;
    base = `https://wa.me/${digits}`;
  }

  const text = prefillMessage?.trim();
  if (!text) return base;

  try {
    const u = new URL(base);
    if (!u.searchParams.get("text")) {
      u.searchParams.set("text", text);
    }
    return u.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}text=${encodeURIComponent(text)}`;
  }
}

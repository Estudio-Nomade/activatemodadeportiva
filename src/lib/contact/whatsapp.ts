/** Digits-only E.164-ish phone from free-form admin input (+, spaces, dashes OK). */
export function whatsappDigits(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || /^(wa\.me|api\.whatsapp\.com)\//i.test(raw)) {
    return null; // URL path — not a bare phone
  }
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  digits = digits.replace(/^00+/, "");
  // AR local without country code (10 digits) → 54…
  if (digits.length === 10) digits = `54${digits}`;
  return digits;
}

/** Value stored in admin settings (phone digits or URL as typed). Always allows leading +. */
export function normalizeWhatsappStored(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(wa\.me|api\.whatsapp\.com)\//i.test(raw)) return `https://${raw}`;
  const digits = whatsappDigits(raw);
  return digits ?? raw;
}

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
    const digits = whatsappDigits(raw);
    if (!digits) return null;
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

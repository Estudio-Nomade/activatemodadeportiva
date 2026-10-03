/** Official store Instagram (fallback when admin field empty). */
export const DEFAULT_INSTAGRAM_URL =
  "https://www.instagram.com/activate.ropa.deportiva/";

/**
 * Normalize Instagram from settings: full URL, @handle, or bare handle.
 * Falls back to DEFAULT_INSTAGRAM_URL when empty.
 */
export function instagramHref(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return DEFAULT_INSTAGRAM_URL;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/\/$/, "");
  if (!handle) return DEFAULT_INSTAGRAM_URL;
  return `https://www.instagram.com/${handle}/`;
}

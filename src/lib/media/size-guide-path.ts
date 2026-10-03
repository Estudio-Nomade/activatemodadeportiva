import { SIZE_GUIDES_BUCKET } from "@/server/storage/port";

/** Strip accidental bucket prefix; keep leading `/` for public site assets. */
export function normalizeSizeGuideStorageKey(storagePath: string): string {
  const raw = storagePath.trim();
  if (raw.startsWith("/")) return raw;
  return raw.replace(new RegExp(`^${SIZE_GUIDES_BUCKET}/`), "");
}

/**
 * Accept site-relative `/size-guides/…` (seed) or storage object keys
 * (no `..`, no http scheme).
 */
export function isValidSizeGuideStoragePath(storagePath: string): boolean {
  const key = normalizeSizeGuideStorageKey(storagePath);
  if (!key || key.length > 512) return false;
  if (key.includes("..")) return false;
  if (/^https?:\/\//i.test(key)) return false;
  if (key.startsWith("/")) {
    return key.startsWith("/size-guides/") && key.length > "/size-guides/".length;
  }
  return true;
}

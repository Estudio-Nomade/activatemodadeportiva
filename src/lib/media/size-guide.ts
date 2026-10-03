import { SIZE_GUIDES_BUCKET } from "@/server/storage/port";
import { normalizeSizeGuideStorageKey } from "./size-guide-path";

/**
 * Resolve size-guide storage_path to a browser URL.
 * Supports absolute URLs, site paths (/size-guides/…), or public bucket keys.
 */
export function resolveSizeGuideUrl(storagePath: string | null | undefined): string | null {
  const raw = (storagePath ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return raw;

  const key = normalizeSizeGuideStorageKey(raw);
  const base =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
      : "") || "";
  if (!base) return `/${key.replace(/^\//, "")}`;
  return `${base}/storage/v1/object/public/${SIZE_GUIDES_BUCKET}/${key}`;
}

export type SizeGuidePublic = {
  id: string;
  name: string;
  storage_path: string | null;
  url: string | null;
};

export function mapSizeGuide(row: {
  id: string;
  name: string;
  storage_path: string | null;
}): SizeGuidePublic {
  return {
    id: row.id,
    name: row.name,
    storage_path: row.storage_path,
    url: resolveSizeGuideUrl(row.storage_path),
  };
}

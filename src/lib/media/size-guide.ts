/**
 * Resolve size-guide storage_path to a browser URL.
 * Supports absolute URLs, site paths (/size-guides/…), or future storage keys.
 */
export function resolveSizeGuideUrl(storagePath: string | null | undefined): string | null {
  const raw = (storagePath ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return raw;

  const base =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
      : "") || "";
  if (!base) return `/${raw.replace(/^\//, "")}`;
  // optional future: size-guides bucket
  return `${base}/storage/v1/object/public/size-guides/${raw.replace(/^size-guides\//, "")}`;
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

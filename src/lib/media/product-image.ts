import { PRODUCT_IMAGES_BUCKET } from "@/server/storage/port";

/** Local fallback when product has no image. */
export const PRODUCT_IMAGE_PLACEHOLDER = "/placeholders/product.svg";

/**
 * Resolve product image `storage_path` to a browser-loadable URL.
 * Accepts:
 * - absolute http(s)
 * - site-relative `/…`
 * - bare object key in public `product-images` bucket
 */
export function resolveProductImageUrl(
  storagePath: string | null | undefined,
  opts?: { supabaseUrl?: string | null },
): string {
  const raw = (storagePath ?? "").trim();
  if (!raw) return PRODUCT_IMAGE_PLACEHOLDER;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return raw;

  const base =
    opts?.supabaseUrl?.replace(/\/$/, "") ||
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") : "") ||
    "";

  if (!base) {
    // Client without env should still try relative public path
    return `/${raw.replace(/^\//, "")}`;
  }

  // strip accidental bucket prefix
  const key = raw.replace(new RegExp(`^${PRODUCT_IMAGES_BUCKET}/`), "");
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${key}`;
}

export type ProductImageRow = {
  id?: string;
  storage_path: string;
  alt?: string | null;
  sort_order?: number;
  url?: string;
};

export function withImageUrls<T extends ProductImageRow>(
  images: T[] | null | undefined,
  opts?: { supabaseUrl?: string | null },
): Array<T & { url: string }> {
  return [...(images ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      ...img,
      url: img.url || resolveProductImageUrl(img.storage_path, opts),
    }));
}

export function primaryProductImageUrl(
  images: ProductImageRow[] | null | undefined,
  opts?: { supabaseUrl?: string | null },
): string {
  const list = withImageUrls(images, opts);
  return list[0]?.url ?? PRODUCT_IMAGE_PLACEHOLDER;
}

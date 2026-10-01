const TILE_BY_SLUG: Record<string, string> = {
  mujer: "/categories/mujer.jpg",
  hombre: "/categories/hombre.jpg",
  accesorios: "/categories/accesorios.jpg",
};

const FALLBACK = "/categories/fallback.jpg";

/** Static public path for home category tiles (no CMS). */
export function categoryTileImageSrc(slug: string): string {
  if (!slug) return FALLBACK;
  return TILE_BY_SLUG[slug] ?? FALLBACK;
}

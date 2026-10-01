import Link from "next/link";
import { ProductImage } from "@/components/store/product-image";
import { formatArsCents, unitPriceCents } from "@/lib/format/money";
import { primaryProductImageUrl } from "@/lib/media/product-image";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    list_price_cents: number;
    promo_price_cents: number | null;
    product_images?:
      | {
          storage_path: string;
          alt?: string | null;
          sort_order?: number;
          url?: string;
        }[]
      | null;
  };
  /** Optional sold-out badge (Pencil 46) */
  soldOut?: boolean;
};

export function ProductCard({ product, soldOut }: ProductCardProps) {
  const price = unitPriceCents(product);
  const hasPromo =
    product.promo_price_cents != null && product.promo_price_cents < product.list_price_cents;
  const imgUrl = primaryProductImageUrl(product.product_images);

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group block overflow-hidden rounded-[16px] border border-border bg-surface"
    >
      <div className="relative aspect-[4/5] bg-surface-soft">
        <ProductImage
          url={imgUrl}
          alt={product.name}
          className="h-full w-full transition group-hover:scale-[1.02]"
          fallbackLabel="Sin foto"
        />
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-full bg-text/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-inverse">
            Agotado
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="text-sm font-semibold leading-snug">{product.name}</h3>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-bold text-accent">{formatArsCents(price)}</span>
          {hasPromo ? (
            <span className="text-xs text-muted line-through">
              {formatArsCents(product.list_price_cents)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

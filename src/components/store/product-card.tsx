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
    <Link href={`/p/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[12px] bg-surface-soft">
        <ProductImage
          url={imgUrl}
          alt={product.name}
          className="h-full w-full transition duration-300 group-hover:scale-[1.02]"
          fallbackLabel="Sin foto"
        />
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-full bg-text/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-inverse">
            Agotado
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="text-[13px] font-semibold leading-snug text-text">{product.name}</h3>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={`text-[13px] font-bold ${hasPromo ? "text-promo" : "text-text"}`}>
            {formatArsCents(price)}
          </span>
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

"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProductImage } from "@/components/store/product-image";
import { SizeGuideSheet } from "@/components/store/size-guide-sheet";
import { useCart } from "@/lib/cart/store";
import { formatArsCents, unitPriceCents } from "@/lib/format/money";
import { primaryProductImageUrl } from "@/lib/media/product-image";
import { trpc } from "@/lib/trpc/client";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const productQ = trpc.catalog.getProduct.useQuery({ slug: params.slug });
  const { addLine } = useCart();
  const product = productQ.data;
  const variants = useMemo(() => product?.product_variants ?? [], [product?.product_variants]);
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color))], [variants]);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const selectedColor = color ?? colors[0] ?? null;
  const sizesForColor = variants.filter((v) => v.color === selectedColor);
  const selectedSize =
    size && sizesForColor.some((v) => v.size === size) ? size : (sizesForColor[0]?.size ?? null);
  const variant = variants.find((v) => v.color === selectedColor && v.size === selectedSize);
  const available = variant?.available ?? 0;
  const price = product ? unitPriceCents(product) : 0;
  const images = useMemo(() => product?.product_images ?? [], [product?.product_images]);
  const [imgIdx, setImgIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const main = images[imgIdx];
  const mainUrl = main?.url ?? primaryProductImageUrl(images);
  const sizeGuide = product?.size_guide ?? null;

  if (productQ.isLoading) {
    return <p className="p-6 text-sm text-muted">Cargando producto…</p>;
  }
  if (productQ.isError || !product) {
    return (
      <div className="p-6">
        <p className="text-danger">Producto no encontrado.</p>
        <Link href="/" className="btn btn-secondary mt-4 max-w-xs">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 px-4 py-6 md:grid-cols-2 md:px-6">
      <div>
        <button
          type="button"
          className="aspect-square w-full overflow-hidden rounded-[16px] border border-border bg-surface-soft"
          onClick={() => setZoom(true)}
        >
          <ProductImage
            url={mainUrl}
            alt={main?.alt || product.name}
            className="h-full w-full"
            fallbackLabel="Sin foto"
          />
        </button>
        {images.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${i === imgIdx ? "border-accent" : "border-border"}`}
                onClick={() => setImgIdx(i)}
              >
                <ProductImage url={img.url} alt="" className="h-full w-full" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-accent">{formatArsCents(price)}</span>
            {product.promo_price_cents != null ? (
              <span className="text-sm text-muted line-through">
                {formatArsCents(product.list_price_cents)}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Color</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                data-active={c === selectedColor}
                onClick={() => {
                  setColor(c);
                  setSize(null);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Talle</p>
            {sizeGuide ? (
              <button
                type="button"
                className="text-xs font-bold text-accent underline-offset-2 hover:underline"
                onClick={() => setGuideOpen(true)}
              >
                Guía de talles
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((v) => (
              <button
                key={v.id}
                type="button"
                className="chip"
                data-active={v.size === selectedSize}
                disabled={v.available <= 0}
                onClick={() => setSize(v.size)}
              >
                {v.size}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            {available > 0 ? `${available} disponibles` : "Sin stock en esta combinación"}
          </p>
        </div>

        {product.description ? (
          <p className="text-sm leading-relaxed text-muted">{product.description}</p>
        ) : null}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!variant || available <= 0}
          onClick={() => {
            if (!variant) return;
            addLine({
              variantId: variant.id,
              productId: product.id,
              productSlug: product.slug,
              productName: product.name,
              color: variant.color,
              size: variant.size,
              unitPriceCents: price,
              maxAvailable: available,
              imagePath: mainUrl,
              qty: 1,
            });
            setAdded(true);
          }}
        >
          {available > 0 ? "Agregar al carrito" : "Sin stock"}
        </button>
        {added ? (
          <Link href="/carrito" className="btn btn-secondary">
            Ver carrito
          </Link>
        ) : null}

        <div className="space-y-2 rounded-[16px] border border-border bg-surface p-4 text-sm text-muted">
          <p>
            <Link href="/medios-de-pago" className="font-semibold text-text">
              Medios de pago
            </Link>
            : transferencia y efectivo (retiro).
          </p>
          <p>
            <Link href="/envios" className="font-semibold text-text">
              Envíos
            </Link>
            : retiro gratis o Andreani.
          </p>
          <p>
            <Link href="/cambios-y-devoluciones" className="font-semibold text-text">
              Cambios
            </Link>
            : gestión por local / WhatsApp.
          </p>
        </div>
      </div>

      {zoom ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mainUrl}
            alt={product.name}
            className="max-h-[90dvh] max-w-full object-contain"
          />
        </div>
      ) : null}

      <SizeGuideSheet
        open={guideOpen}
        title={sizeGuide?.name ?? "Guía de talles"}
        imageUrl={sizeGuide?.url ?? null}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}

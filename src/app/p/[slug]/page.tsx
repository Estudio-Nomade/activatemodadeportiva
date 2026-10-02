"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IconClose, IconZoom } from "@/components/store/icons";
import { ProductImage } from "@/components/store/product-image";
import { SizeGuideSheet } from "@/components/store/size-guide-sheet";
import { buildPdpMetaChips } from "@/lib/catalog/pdp-meta";
import { useCart } from "@/lib/cart/store";
import { discountPercentFromBps } from "@/lib/format/promo";
import { formatArsCents, unitPriceCents } from "@/lib/format/money";
import { primaryProductImageUrl } from "@/lib/media/product-image";
import { trpc } from "@/lib/trpc/client";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const productQ = trpc.catalog.getProduct.useQuery({ slug: params.slug });
  const settings = trpc.settings.getPublic.useQuery();
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

  const productSoldOut =
    variants.length === 0 || variants.every((v) => v.available <= 0);
  const comboOos = Boolean(variant && available <= 0);
  const discPct = discountPercentFromBps(settings.data?.payment_discount_bps ?? 1000);
  const metaChips = buildPdpMetaChips(discPct);
  const hasPromo =
    product != null &&
    product.promo_price_cents != null &&
    product.promo_price_cents < product.list_price_cents;

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight" && images.length > 1) {
        setImgIdx((i) => (i + 1) % images.length);
      }
      if (e.key === "ArrowLeft" && images.length > 1) {
        setImgIdx((i) => (i - 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom, images.length]);

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
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-2 md:items-start md:gap-10 md:px-6 md:pb-14 lg:gap-14 lg:px-8">
      <div className="-mx-4 md:sticky md:top-24 md:mx-0">
        <div className="relative aspect-square w-full overflow-hidden bg-surface-soft md:aspect-[4/5] md:rounded-[16px] md:border md:border-border lg:rounded-[20px]">
          <button
            type="button"
            className="absolute inset-0 z-0"
            onClick={() => setZoom(true)}
            aria-label="Ampliar imagen"
          >
            <ProductImage
              url={mainUrl}
              alt={main?.alt || product.name}
              className="h-full w-full"
              fallbackLabel="Sin foto"
            />
          </button>
          {productSoldOut ? (
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-text/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-inverse">
              Agotado
            </span>
          ) : null}
          <button
            type="button"
            className="absolute bottom-3 right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/80 text-text shadow-sm"
            onClick={() => setZoom(true)}
            aria-label="Zoom"
          >
            <IconZoom />
          </button>
        </div>
        {images.length > 1 ? (
          <div className="mt-0 flex gap-2 overflow-x-auto bg-surface px-4 py-2.5 md:mt-3 md:bg-transparent md:px-0">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === imgIdx ? "border-accent" : "border-transparent bg-surface-soft"}`}
                onClick={() => setImgIdx(i)}
              >
                <ProductImage url={img.url} alt="" className="h-full w-full" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 pb-24 md:max-w-xl md:pb-4 lg:pt-2">
        <div>
          <h1 className="text-[22px] font-bold leading-snug md:text-3xl lg:text-4xl">
            {product.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
            {hasPromo ? (
              <>
                <span className="text-sm text-muted line-through">
                  {formatArsCents(product.list_price_cents)}
                </span>
                <span className="text-xl font-bold text-promo">{formatArsCents(price)}</span>
              </>
            ) : (
              <span className="text-xl font-bold text-text">{formatArsCents(price)}</span>
            )}
          </div>
        </div>

        {productSoldOut ? (
          <div
            className="rounded-[12px] border border-danger/25 bg-danger/10 px-4 py-3"
            role="status"
          >
            <p className="text-sm font-bold text-danger">Producto agotado</p>
            <p className="mt-1 text-sm text-muted">
              No hay stock en ningún talle/color por ahora. Podés mirar otras categorías o avisarnos
              por WhatsApp.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/" className="btn btn-secondary max-w-[180px] text-sm">
                Ver catálogo
              </Link>
              <Link href="/buscar" className="btn btn-ghost max-w-[140px] text-sm">
                Buscar
              </Link>
            </div>
          </div>
        ) : null}

        {!productSoldOut && comboOos ? (
          <div
            className="rounded-[12px] border border-promo/30 bg-[#FBF0EE] px-4 py-3"
            role="status"
          >
            <p className="text-sm font-bold text-promo">Sin stock en esta combinación</p>
            <p className="mt-1 text-sm text-muted">Probá otro color o talle disponible.</p>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-[13px] font-semibold text-text">Color</p>
          <div className="flex flex-wrap gap-2.5">
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
            <p className="text-[13px] font-semibold text-text">Talle</p>
            {sizeGuide ? (
              <button
                type="button"
                className="min-h-11 text-xs font-semibold text-accent underline-offset-2 hover:underline"
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
                className="chip chip-size"
                data-active={v.size === selectedSize}
                disabled={v.available <= 0}
                onClick={() => setSize(v.size)}
              >
                {v.size}
              </button>
            ))}
          </div>
          {!productSoldOut ? (
            <p className="mt-2 text-sm text-muted">
              {available > 0 ? `${available} disponibles` : "Elegí otra combinación"}
            </p>
          ) : null}
        </div>

        {product.description ? (
          <p className="text-[13px] leading-relaxed text-muted">{product.description}</p>
        ) : null}

        <ul className="flex flex-col gap-2 text-xs text-muted md:text-sm">
          {metaChips.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface p-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:static md:mt-2 md:border-0 md:bg-transparent md:p-0">
          <button
            type="button"
            className="btn btn-primary tracking-[0.06em] md:max-w-sm"
            disabled={!variant || available <= 0 || productSoldOut}
            onClick={() => {
              if (!variant || available <= 0) return;
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
            {productSoldOut ? "Agotado" : available > 0 ? "Sumar al carrito" : "Sin stock"}
          </button>
          {added ? (
            <Link href="/carrito" className="btn btn-secondary mt-2 md:max-w-sm">
              Ver carrito
            </Link>
          ) : null}
        </div>
      </div>

      {zoom ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
        >
          <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="truncate px-2 text-sm font-semibold text-white/90">{product.name}</p>
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-full text-white"
              onClick={() => setZoom(false)}
              aria-label="Cerrar zoom"
            >
              <IconClose />
            </button>
          </div>
          <button
            type="button"
            className="flex min-h-0 flex-1 items-center justify-center p-4"
            onClick={() => setZoom(false)}
            aria-label="Cerrar"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainUrl}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </button>
          {images.length > 1 ? (
            <div className="flex justify-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={`h-2 w-2 rounded-full ${i === imgIdx ? "bg-white" : "bg-white/40"}`}
                  aria-label={`Imagen ${i + 1}`}
                  onClick={() => setImgIdx(i)}
                />
              ))}
            </div>
          ) : null}
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

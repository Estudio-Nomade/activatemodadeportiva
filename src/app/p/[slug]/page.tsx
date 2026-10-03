"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IconClose, IconZoom } from "@/components/store/icons";
import { ProductImage } from "@/components/store/product-image";
import { PdpInfoAccordions } from "@/components/store/pdp-info-accordions";
import { PdpShippingEstimate } from "@/components/store/pdp-shipping-estimate";
import { SizeGuideSheet } from "@/components/store/size-guide-sheet";
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
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [addedQty, setAddedQty] = useState(0);
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

  const hasPromo =
    product != null &&
    product.promo_price_cents != null &&
    product.promo_price_cents < product.list_price_cents;

  const maxQty = Math.max(0, available);
  const clampedQty = maxQty === 0 ? 1 : Math.min(Math.max(1, qty), maxQty);

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

  const decQty = () => setQty((q) => Math.max(1, q - 1));
  const incQty = () => {
    if (maxQty <= 0) return;
    setQty((q) => Math.min(maxQty, q + 1));
  };

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
          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg font-bold text-text shadow-sm"
                aria-label="Foto anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i - 1 + images.length) % images.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg font-bold text-text shadow-sm"
                aria-label="Foto siguiente"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i + 1) % images.length);
                }}
              >
                ›
              </button>
              <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
                {images.map((img, i) => (
                  <span
                    key={img.id}
                    className={`h-1.5 w-1.5 rounded-full ${i === imgIdx ? "bg-white" : "bg-white/45"}`}
                  />
                ))}
              </div>
            </>
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
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === imgIdx}
              >
                <ProductImage url={img.url} alt="" className="h-full w-full" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 pb-28 md:max-w-xl md:pb-4 lg:pt-2">
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
          {discPct > 0 ? (
            <p className="mt-1.5 text-xs font-semibold text-accent md:text-sm">
              {discPct}% off transferencia o efectivo
            </p>
          ) : null}
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
                  const nextSizes = variants.filter((v) => v.color === c);
                  const nextAvail = nextSizes[0]?.available ?? 0;
                  if (nextAvail > 0) {
                    setQty((q) => Math.min(Math.max(1, q), nextAvail));
                  }
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-text">Talle</p>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((v) => (
              <button
                key={v.id}
                type="button"
                className="chip chip-size"
                data-active={v.size === selectedSize}
                disabled={v.available <= 0}
                onClick={() => {
                  setSize(v.size);
                  if (v.available > 0) {
                    setQty((q) => Math.min(Math.max(1, q), v.available));
                  }
                }}
              >
                {v.size}
              </button>
            ))}
          </div>
          {sizeGuide ? (
            <button
              type="button"
              className="mt-2 min-h-11 text-left text-xs font-semibold text-accent underline underline-offset-2"
              onClick={() => setGuideOpen(true)}
            >
              Tabla de talles
            </button>
          ) : null}
          {!productSoldOut ? (
            <p className="mt-2 text-sm text-muted">
              {available > 0 ? `${available} disponibles` : "Elegí otra combinación"}
            </p>
          ) : null}
        </div>

        {!productSoldOut && available > 0 ? (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-text">Cantidad</p>
            <div className="inline-flex items-center rounded-[12px] border border-border">
              <button
                type="button"
                className="grid h-12 w-12 place-items-center text-lg font-semibold text-text disabled:opacity-40"
                onClick={decQty}
                disabled={clampedQty <= 1}
                aria-label="Restar cantidad"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="h-12 w-12 border-x border-border bg-transparent text-center text-sm font-bold text-text outline-none"
                value={clampedQty}
                aria-label="Cantidad"
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                  if (!Number.isFinite(n)) {
                    setQty(1);
                    return;
                  }
                  setQty(Math.min(maxQty, Math.max(1, n)));
                }}
              />
              <button
                type="button"
                className="grid h-12 w-12 place-items-center text-lg font-semibold text-text disabled:opacity-40"
                onClick={incQty}
                disabled={clampedQty >= maxQty}
                aria-label="Sumar cantidad"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        {!productSoldOut ? (
          <PdpShippingEstimate
            unitPriceCents={price}
            qty={clampedQty}
            paymentDiscountBps={settings.data?.payment_discount_bps ?? 1000}
            andreaniFeeCents={settings.data?.andreani_fee_cents ?? 0}
            freeShippingThresholdCents={settings.data?.free_shipping_threshold_cents ?? 0}
            contactAddress={settings.data?.contact_address}
          />
        ) : null}

        {/* In-flow CTA (not fixed) so mobile scroll doesn't keep a floating bar chasing the viewport */}
        <div className="mt-2 space-y-2 md:max-w-sm">
          <button
            type="button"
            className="btn btn-primary tracking-[0.06em]"
            disabled={!variant || available <= 0 || productSoldOut}
            onClick={() => {
              if (!variant || available <= 0) return;
              const n = clampedQty;
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
                qty: n,
              });
              setAddedQty(n);
              setAdded(true);
            }}
          >
            {productSoldOut ? "Agotado" : available > 0 ? "Sumar al carrito" : "Sin stock"}
          </button>
          {added ? (
            <div className="space-y-2">
              <p className="text-center text-xs font-semibold text-accent md:text-left">
                Agregado (x{addedQty})
              </p>
              <Link href="/carrito" className="btn btn-secondary">
                Ver carrito
              </Link>
            </div>
          ) : null}
        </div>

        <div className="pt-2 md:pt-4">
          <PdpInfoAccordions
            description={product.description}
            compositionCareText={product.composition_care_text}
          />
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
            <div className="flex items-center justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-full text-2xl text-white"
                aria-label="Foto anterior"
                onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
              >
                ‹
              </button>
              <div className="flex justify-center gap-2">
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
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-full text-2xl text-white"
                aria-label="Foto siguiente"
                onClick={() => setImgIdx((i) => (i + 1) % images.length)}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <SizeGuideSheet
        open={guideOpen}
        title={sizeGuide?.name ?? "Tabla de talles"}
        imageUrl={sizeGuide?.url ?? null}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}

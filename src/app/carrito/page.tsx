"use client";

import Link from "next/link";
import { ProductImage } from "@/components/store/product-image";
import { useCart } from "@/lib/cart/store";
import { formatArsCents } from "@/lib/format/money";
import { resolveProductImageUrl } from "@/lib/media/product-image";

export default function CartPage() {
  const { lines, setQty, removeLine, count } = useCart();
  const subtotal = lines.reduce((n, l) => n + l.unitPriceCents * l.qty, 0);

  if (count === 0) {
    return (
      <div className="px-4 py-16 text-center md:px-6">
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-muted">Explorá la colección y sumá productos.</p>
        <Link href="/" className="btn btn-primary mx-auto mt-6 max-w-xs">
          Ir al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold">Carrito</h1>
      <ul className="mt-5 space-y-3">
        {lines.map((l) => (
          <li
            key={l.variantId}
            className="flex gap-3 rounded-[16px] border border-border bg-surface p-3"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-soft">
              <ProductImage
                url={resolveProductImageUrl(l.imagePath)}
                alt={l.productName}
                className="h-full w-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/p/${l.productSlug}`} className="font-semibold">
                {l.productName}
              </Link>
              <p className="text-sm text-muted">
                {l.color} · {l.size}
              </p>
              <p className="text-sm font-bold text-accent">
                {formatArsCents(l.unitPriceCents * l.qty)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border"
                  onClick={() => setQty(l.variantId, l.qty - 1)}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold">{l.qty}</span>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border"
                  disabled={l.qty >= l.maxAvailable}
                  onClick={() => setQty(l.variantId, l.qty + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-auto text-sm text-danger"
                  onClick={() => removeLine(l.variantId)}
                >
                  Quitar
                </button>
              </div>
              {l.qty >= l.maxAvailable ? (
                <p className="mt-1 text-xs text-promo">Máximo disponible: {l.maxAvailable}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 mt-6 border-t border-border bg-bg/95 py-4 backdrop-blur">
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-muted">Subtotal (sin descuentos/envío)</span>
          <strong>{formatArsCents(subtotal)}</strong>
        </div>
        <p className="mb-3 text-xs text-muted">El total final se calcula en el checkout (servidor).</p>
        <Link href="/checkout" className="btn btn-primary">
          Iniciar compra
        </Link>
      </div>
    </div>
  );
}

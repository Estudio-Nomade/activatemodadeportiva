"use client";

import { useState } from "react";
import {
  PRODUCT_IMAGE_PLACEHOLDER,
  resolveProductImageUrl,
} from "@/lib/media/product-image";

type Props = {
  path?: string | null;
  /** Pre-resolved URL (from server) wins over path */
  url?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  fallbackLabel?: string;
};

export function ProductImage({
  path,
  url,
  alt = "",
  className = "",
  imgClassName = "h-full w-full object-cover",
  fallbackLabel,
}: Props) {
  const resolved = (url || resolveProductImageUrl(path)).trim() || PRODUCT_IMAGE_PLACEHOLDER;
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const exhausted = failedFor === PRODUCT_IMAGE_PLACEHOLDER;
  const src =
    failedFor === resolved
      ? PRODUCT_IMAGE_PLACEHOLDER
      : exhausted
        ? null
        : resolved;

  if (!src) {
    return (
      <div
        className={`grid place-items-center bg-surface-soft text-xs font-semibold uppercase tracking-wide text-muted ${className}`}
        aria-label={alt || "Sin foto"}
      >
        {fallbackLabel ?? "Sin foto"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={resolved}
      src={src}
      alt={alt}
      className={`${imgClassName} ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailedFor(src)}
    />
  );
}

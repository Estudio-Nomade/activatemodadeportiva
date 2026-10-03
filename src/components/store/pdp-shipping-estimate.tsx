"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatArsCents } from "@/lib/format/money";
import { estimateShipping } from "@/lib/shipping/estimate-shipping";
import { isValidArPostalCode, normalizePostalCode } from "@/lib/shipping/postal-code";

type Props = {
  unitPriceCents: number;
  qty: number;
  paymentDiscountBps: number;
  andreaniFeeCents: number;
  freeShippingThresholdCents: number;
  contactAddress?: string | null;
};

export function PdpShippingEstimate({
  unitPriceCents,
  qty,
  paymentDiscountBps,
  andreaniFeeCents,
  freeShippingThresholdCents,
  contactAddress,
}: Props) {
  const [cp, setCp] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimate = useMemo(() => {
    if (!submitted) return null;
    return estimateShipping({
      unitPriceCents,
      qty,
      paymentDiscountBps,
      andreaniFeeCents,
      freeShippingThresholdCents,
    });
  }, [
    submitted,
    unitPriceCents,
    qty,
    paymentDiscountBps,
    andreaniFeeCents,
    freeShippingThresholdCents,
  ]);

  const onCalculate = () => {
    const normalized = normalizePostalCode(cp);
    if (!isValidArPostalCode(normalized)) {
      setError("Ingresá un código postal válido (4 dígitos o CPA, ej. 7000 o B1900AAA).");
      setSubmitted(null);
      return;
    }
    setError(null);
    setSubmitted(normalized);
  };

  const localLabel = contactAddress?.trim()
    ? contactAddress.trim()
    : "San Manuel";

  return (
    <div className="rounded-[12px] border border-border bg-surface-soft/60 p-3.5 md:p-4">
      <p className="text-[13px] font-bold uppercase tracking-wide text-text">
        ¿Cuánto sale el envío?
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="pdp-cp">
          Código postal
        </label>
        <input
          id="pdp-cp"
          type="text"
          inputMode="text"
          autoComplete="postal-code"
          placeholder="Código postal"
          value={cp}
          onChange={(e) => {
            setCp(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCalculate();
            }
          }}
          className="min-h-12 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="button"
          className="btn btn-secondary min-h-12 shrink-0 px-4 text-sm md:max-w-[140px]"
          onClick={onCalculate}
        >
          Calcular
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {estimate && submitted ? (
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <strong className="text-text">Retiro en local:</strong> Gratis
            {localLabel ? ` · ${localLabel}` : null}
          </li>
          <li>
            <strong className="text-text">Andreani a domicilio:</strong>{" "}
            {estimate.freeShippingReached ? (
              <span className="font-semibold text-accent">Gratis</span>
            ) : (
              formatArsCents(estimate.andreaniCents)
            )}
            {!estimate.freeShippingReached && freeShippingThresholdCents > 0 ? (
              <span className="block text-xs mt-0.5">
                Gratis desde {formatArsCents(freeShippingThresholdCents)} (post dto.
                transferencia)
                {estimate.centsToFreeShipping > 0 ? (
                  <> · te faltan {formatArsCents(estimate.centsToFreeShipping)}</>
                ) : null}
              </span>
            ) : null}
          </li>
          <li className="text-xs leading-relaxed">
            CP {submitted}. Mismo costo Andreani a todo el país en v1 (no tarifa por zona). El
            total final se confirma en el checkout.{" "}
            <Link href="/envios" className="font-semibold text-accent underline underline-offset-2">
              Ver envíos
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

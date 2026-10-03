"use client";

import { centsToPesosInput, formatArsCents, pesosToCents } from "@/lib/format/money";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Empty string allowed (e.g. optional promo). */
  optional?: boolean;
  disabled?: boolean;
  hint?: string;
};

/**
 * Admin money input in **pesos** (type 10000 for $10.000).
 * Server still stores integer cents — conversion is automatic on save via pesosToCents.
 */
export function AdminMoneyField({
  id,
  label,
  value,
  onChange,
  optional = false,
  disabled = false,
  hint,
}: Props) {
  const trimmed = value.trim();
  const cents = trimmed ? pesosToCents(value) : null;
  const showPreview = trimmed.length > 0 && cents != null && Number.isFinite(cents);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted"
          aria-hidden
        >
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          className="admin-money-input w-full"
          value={value}
          placeholder={optional ? "Opcional" : "10000"}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!trimmed) return;
            // Normalize display after edit (10000,5 → 10000,50; keep whole as 10000)
            onChange(centsToPesosInput(pesosToCents(value)));
          }}
        />
      </div>
      <p className="text-xs text-muted">
        {showPreview ? (
          <>
            Se guarda como <span className="font-semibold text-text">{formatArsCents(cents)}</span>
            <span className="text-muted"> (centavos automáticos)</span>
          </>
        ) : (
          (hint ??
            "Escribí el monto en pesos, ej. 10000 = $ 10.000. Los centavos se calculan solos.")
        )}
      </p>
    </div>
  );
}

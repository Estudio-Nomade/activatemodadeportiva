"use client";

import { useState } from "react";
import { AdminMoneyField } from "@/components/admin/money-field";
import { useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { centsToPesosInput, pesosToCents } from "@/lib/format/money";
import { trpc } from "@/lib/trpc/client";

type SettingsDraft = {
  season_label: string;
  whatsapp_url_or_phone: string;
  whatsapp_prefill_message: string;
  instagram_url: string;
  transfer_cbu_alias_text: string;
  payment_discount_bps: number;
  /** pesos string for UI; converted to cents on save */
  andreani_fee_pesos: string;
  free_shipping_threshold_pesos: string;
  contact_email: string;
  contact_address: string;
};

export default function AdminConfigPage() {
  const token = useAdminToken();
  const settingsQ = trpc.admin.settings.get.useQuery(undefined, { enabled: !!token });
  const updateSettings = trpc.admin.settings.update.useMutation();

  const [touched, setTouched] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft>({
    season_label: "",
    whatsapp_url_or_phone: "",
    whatsapp_prefill_message: "",
    instagram_url: "",
    transfer_cbu_alias_text: "",
    payment_discount_bps: 1000,
    andreani_fee_pesos: "0",
    free_shipping_threshold_pesos: "0",
    contact_email: "",
    contact_address: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  const remote = settingsQ.data;
  const form: SettingsDraft =
    touched || !remote
      ? draft
      : {
          season_label: remote.season_label ?? "",
          whatsapp_url_or_phone: remote.whatsapp_url_or_phone ?? "",
          whatsapp_prefill_message: remote.whatsapp_prefill_message ?? "",
          instagram_url: remote.instagram_url ?? "",
          transfer_cbu_alias_text: remote.transfer_cbu_alias_text ?? "",
          payment_discount_bps: remote.payment_discount_bps ?? 1000,
          andreani_fee_pesos: centsToPesosInput(remote.andreani_fee_cents ?? 0),
          free_shipping_threshold_pesos: centsToPesosInput(
            remote.free_shipping_threshold_cents ?? 0,
          ),
          contact_email: remote.contact_email ?? "",
          contact_address: remote.contact_address ?? "",
        };

  function patch<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setTouched(true);
    setDraft((s) => ({ ...(touched ? s : form), [key]: value }));
  }

  if (settingsQ.isLoading) {
    return <p className="text-sm text-muted">Cargando configuración…</p>;
  }

  if (settingsQ.isError) {
    const errMsg = errorMessage(settingsQ.error);
    const unauthorized =
      errMsg === "UNAUTHORIZED" ||
      /unauthorized/i.test(errMsg) ||
      settingsQ.error.data?.code === "UNAUTHORIZED";
    return (
      <div className="space-y-2 text-sm">
        <p className="text-danger">{errMsg}</p>
        {unauthorized ? (
          <p className="text-muted">
            Sesión vencida o sin permiso. Salí y volvé a entrar en{" "}
            <a className="font-semibold text-accent" href="/admin/login">
              /admin/login
            </a>
            . Usuario: Auth de Supabase + fila en <code>admin_profiles</code>.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        updateSettings.mutate(
          {
            season_label: form.season_label,
            whatsapp_url_or_phone: form.whatsapp_url_or_phone,
            whatsapp_prefill_message: form.whatsapp_prefill_message,
            instagram_url: form.instagram_url,
            transfer_cbu_alias_text: form.transfer_cbu_alias_text,
            payment_discount_bps: form.payment_discount_bps,
            andreani_fee_cents: pesosToCents(form.andreani_fee_pesos),
            free_shipping_threshold_cents: pesosToCents(form.free_shipping_threshold_pesos),
            contact_email: form.contact_email,
            contact_address: form.contact_address,
          },
          {
            onSuccess: async (row) => {
              const skipped =
                row &&
                typeof row === "object" &&
                "_prefillSkipped" in row &&
                typeof (row as { _prefillSkipped?: string })._prefillSkipped === "string"
                  ? (row as { _prefillSkipped: string })._prefillSkipped
                  : null;
              setMsg(skipped ? `Config guardada. ${skipped}` : "Config guardada");
              setTouched(false);
              await settingsQ.refetch();
            },
            onError: (err) => setMsg(errorMessage(err)),
          },
        );
      }}
    >
      <div className="field">
        <label htmlFor="season_label">Temporada / colección (hero)</label>
        <input
          id="season_label"
          value={form.season_label}
          onChange={(e) => patch("season_label", e.target.value)}
        />
        <p className="text-xs text-muted">
          Se muestra arriba de “Disciplina en movimiento” en la home.
        </p>
      </div>

      <div className="field">
        <label htmlFor="whatsapp_url_or_phone">WhatsApp (número o URL)</label>
        <input
          id="whatsapp_url_or_phone"
          value={form.whatsapp_url_or_phone}
          onChange={(e) => patch("whatsapp_url_or_phone", e.target.value)}
          placeholder="+54 9 11 1234-5678"
          inputMode="tel"
          autoComplete="tel"
        />
        <p className="text-xs text-muted">
          Podés poner el + sin problema (ej. +54911…). También vale con espacios o guiones. Se arma
          solo el link del footer y el botón flotante.
        </p>
      </div>

      <div className="field">
        <label htmlFor="whatsapp_prefill_message">Mensaje inicial de WhatsApp</label>
        <textarea
          id="whatsapp_prefill_message"
          rows={3}
          value={form.whatsapp_prefill_message}
          onChange={(e) => patch("whatsapp_prefill_message", e.target.value)}
          placeholder="¡Hola! Quiero consultar sobre una prenda"
          className="min-h-[4.5rem] w-full resize-y"
        />
        <p className="text-xs text-muted">
          Texto que se abre ya escrito al tocar WhatsApp (opcional, máx. 500).
        </p>
      </div>

      {(
        [
          ["instagram_url", "Instagram URL"],
          ["transfer_cbu_alias_text", "Alias / CBU"],
          ["contact_email", "Email de contacto"],
          ["contact_address", "Dirección del local"],
        ] as const
      ).map(([key, label]) => (
        <div className="field" key={key}>
          <label htmlFor={key}>{label}</label>
          <input id={key} value={form[key]} onChange={(e) => patch(key, e.target.value)} />
        </div>
      ))}

      <div className="field">
        <label htmlFor="bps">Descuento transferencia/efectivo (%)</label>
        <input
          id="bps"
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round((form.payment_discount_bps || 0) / 100)}
          onChange={(e) => {
            const pct = Math.max(0, Math.min(100, Math.floor(Number(e.target.value) || 0)));
            patch("payment_discount_bps", pct * 100);
          }}
        />
        <p className="text-xs text-muted">
          Ej: 10 = 10% off. Se guarda en bps internamente ({form.payment_discount_bps}).
        </p>
      </div>

      <AdminMoneyField
        id="fee"
        label="Costo fijo Andreani"
        value={form.andreani_fee_pesos}
        onChange={(v) => patch("andreani_fee_pesos", v)}
        hint="Escribí pesos, ej. 4500 = $ 4.500. Los centavos se calculan solos al guardar."
      />

      <AdminMoneyField
        id="thr"
        label="Envío gratis desde"
        value={form.free_shipping_threshold_pesos}
        onChange={(v) => patch("free_shipping_threshold_pesos", v)}
        hint="Umbral en pesos (post descuento en quote). Ej. 80000 = $ 80.000."
      />

      {msg ? <p className="text-sm text-muted">{msg}</p> : null}

      <div className="pt-1">
        <button type="submit" className="btn btn-primary" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

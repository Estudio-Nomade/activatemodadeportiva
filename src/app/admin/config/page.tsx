"use client";

import { useState } from "react";
import { useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

type SettingsDraft = {
  season_label: string;
  whatsapp_url_or_phone: string;
  instagram_url: string;
  transfer_cbu_alias_text: string;
  payment_discount_bps: number;
  andreani_fee_cents: number;
  free_shipping_threshold_cents: number;
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
    instagram_url: "",
    transfer_cbu_alias_text: "",
    payment_discount_bps: 1000,
    andreani_fee_cents: 0,
    free_shipping_threshold_cents: 0,
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
          instagram_url: remote.instagram_url ?? "",
          transfer_cbu_alias_text: remote.transfer_cbu_alias_text ?? "",
          payment_discount_bps: remote.payment_discount_bps ?? 1000,
          andreani_fee_cents: remote.andreani_fee_cents ?? 0,
          free_shipping_threshold_cents: remote.free_shipping_threshold_cents ?? 0,
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
    return <p className="text-sm text-danger">{errorMessage(settingsQ.error)}</p>;
  }

  return (
    <form
      className="space-y-3 rounded-[16px] border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        updateSettings.mutate(form, {
          onSuccess: async () => {
            setMsg("Config guardada");
            setTouched(false);
            await settingsQ.refetch();
          },
          onError: (err) => setMsg(errorMessage(err)),
        });
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

      {(
        [
          ["whatsapp_url_or_phone", "WhatsApp (url o teléfono)"],
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
        <label htmlFor="bps">Descuento transferencia/efectivo (bps, 1000 = 10%)</label>
        <input
          id="bps"
          type="number"
          min={0}
          value={form.payment_discount_bps}
          onChange={(e) => patch("payment_discount_bps", Number(e.target.value) || 0)}
        />
      </div>

      <div className="field">
        <label htmlFor="fee">Costo fijo Andreani (centavos)</label>
        <input
          id="fee"
          type="number"
          min={0}
          value={form.andreani_fee_cents}
          onChange={(e) => patch("andreani_fee_cents", Number(e.target.value) || 0)}
        />
        <p className="text-xs text-muted">
          Ej: $4500 → 450000 centavos. Se muestra en tienda vía quote.
        </p>
      </div>

      <div className="field">
        <label htmlFor="thr">Envío gratis desde (centavos)</label>
        <input
          id="thr"
          type="number"
          min={0}
          value={form.free_shipping_threshold_cents}
          onChange={(e) => patch("free_shipping_threshold_cents", Number(e.target.value) || 0)}
        />
      </div>

      {msg ? <p className="text-sm text-muted">{msg}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={updateSettings.isPending}>
        {updateSettings.isPending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

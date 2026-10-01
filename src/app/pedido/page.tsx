"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatArsCents } from "@/lib/format/money";
import { domainCode, errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_confirmado: "Pago confirmado",
  preparando: "Preparando",
  listo_retiro: "Listo para retiro",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

type TrackItem = {
  id: string;
  product_name: string;
  color: string;
  size: string;
  unit_price_cents: number;
  qty: number;
};

type TrackProof = {
  id: string;
  storage_path: string;
  uploaded_at: string;
};

type TrackOrder = {
  code: string;
  status: string;
  customer_name: string;
  payment_method: string;
  total_cents: number;
  reservation_expires_at: string | null;
  order_items: TrackItem[] | null;
  payment_proofs: TrackProof[] | null;
  access_token?: string;
};

function TrackInner() {
  const sp = useSearchParams();
  const initialToken = sp.get("token") ?? "";
  const initialCode = sp.get("code") ?? "";
  const [codeInput, setCodeInput] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);
  const [activeToken, setActiveToken] = useState(initialToken);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const byToken = trpc.orders.getByToken.useQuery(
    { token: activeToken },
    { enabled: !!activeToken },
  );
  const byCode = trpc.orders.getByCode.useQuery(
    { code: activeCode },
    { enabled: !!activeCode && !activeToken },
  );

  const order = (byToken.data ?? byCode.data) as TrackOrder | undefined;
  const loading = byToken.isFetching || byCode.isFetching;
  const err = byToken.error ?? byCode.error;

  const createUpload = trpc.orders.createProofUploadUrl.useMutation();
  const confirmProof = trpc.orders.uploadPaymentProof.useMutation();

  const tokenForActions = useMemo(() => {
    if (activeToken) return activeToken;
    if (order?.access_token) return order.access_token;
    return "";
  }, [activeToken, order]);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setActiveToken("");
    setActiveCode(codeInput.trim());
  }

  async function onUpload(file: File | null) {
    if (!file || !order) return;
    setUploadMsg(null);
    try {
      const up = await createUpload.mutateAsync(
        tokenForActions
          ? { token: tokenForActions, fileName: file.name }
          : { code: order.code, fileName: file.name },
      );
      const put = await fetch(up.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("No se pudo subir el archivo");
      await confirmProof.mutateAsync(
        tokenForActions
          ? { token: tokenForActions, storagePath: up.path }
          : { code: order.code, storagePath: up.path },
      );
      setUploadMsg("Comprobante subido.");
      await Promise.all([byToken.refetch(), byCode.refetch()]);
    } catch (e) {
      const code = domainCode(e);
      if (code === "ORDER_NOT_PENDING") setUploadMsg("El pedido ya no admite comprobante.");
      else setUploadMsg(errorMessage(e, "Error al subir comprobante"));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold">Consultar pedido</h1>

      <form
        onSubmit={onLookup}
        className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 sm:flex-row"
      >
        <div className="field flex-1">
          <label htmlFor="code">Código de pedido</label>
          <input
            id="code"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="ACT-…"
          />
        </div>
        <button type="submit" className="btn btn-primary sm:mt-6 sm:w-auto sm:px-8">
          Buscar
        </button>
      </form>

      {loading ? <p className="text-sm text-muted">Buscando…</p> : null}
      {err ? (
        <p className="text-sm text-danger">
          {domainCode(err) === "ORDER_NOT_FOUND"
            ? "No encontramos un pedido con ese código."
            : errorMessage(err)}
        </p>
      ) : null}

      {order ? (
        <div className="space-y-4 rounded-[16px] border border-border bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-sm font-bold">{order.code}</p>
              <p className="text-sm text-muted">{order.customer_name}</p>
            </div>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>

          {order.status === "pendiente_pago" && order.reservation_expires_at ? (
            <p className="text-xs text-promo">
              Reserva hasta {new Date(order.reservation_expires_at).toLocaleString("es-AR")}
            </p>
          ) : null}

          <div className="space-y-1 text-sm">
            {(order.order_items ?? []).map((it) => (
              <div key={it.id} className="flex justify-between gap-3">
                <span>
                  {it.product_name} · {it.color}/{it.size} × {it.qty}
                </span>
                <span>{formatArsCents(it.unit_price_cents * it.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 font-bold">
              <span>Total</span>
              <span>{formatArsCents(order.total_cents)}</span>
            </div>
          </div>

          {order.status === "pendiente_pago" && order.payment_method === "transfer" ? (
            <div className="space-y-2 rounded-[12px] bg-surface-soft p-3">
              <p className="text-sm font-semibold">Subir comprobante</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
              {uploadMsg ? <p className="text-xs text-muted">{uploadMsg}</p> : null}
              {(order.payment_proofs?.length ?? 0) > 0 ? (
                <p className="text-xs text-success">
                  Ya hay {order.payment_proofs!.length} comprobante(s) cargado(s).
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function PedidoPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Cargando…</p>}>
      <TrackInner />
    </Suspense>
  );
}

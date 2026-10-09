"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderStatusBanner } from "@/components/store/order-status-banner";
import {
  OrderTimeline,
  orderStatusLabel,
} from "@/components/store/order-timeline";
import { formatArsCents } from "@/lib/format/money";
import { domainCode, errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc/client";

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
  shipping_method: string;
  total_cents: number;
  reservation_expires_at: string | null;
  cancel_reason?: string | null;
  order_items: TrackItem[] | null;
  payment_proofs: TrackProof[] | null;
  /** Only present on getByToken — never rely on this from getByCode. */
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
  const [toast, setToast] = useState<string | null>(null);
  const [pendingProof, setPendingProof] = useState<File | null>(null);

  const settings = trpc.settings.getPublic.useQuery();
  const byToken = trpc.orders.getByToken.useQuery(
    { token: activeToken },
    { enabled: !!activeToken },
  );
  const byCode = trpc.orders.getByCode.useQuery(
    { code: activeCode },
    { enabled: !!activeCode && !activeToken },
  );

  const order = (byToken.data ?? byCode.data) as TrackOrder | undefined;
  // Only surface the query that is actually enabled — disabled refetch() can
  // leave a stale Zod "code too small" error on byCode while token view works.
  const loading = activeToken
    ? byToken.isFetching
    : activeCode
      ? byCode.isFetching
      : false;
  const err = activeToken
    ? byToken.error
    : activeCode
      ? byCode.error
      : null;
  const notFound =
    !!err && domainCode(err) === "ORDER_NOT_FOUND" && !loading && !order;
  const searched = !!(activeCode || activeToken);

  const createUpload = trpc.orders.createProofUploadUrl.useMutation();
  const confirmProof = trpc.orders.uploadPaymentProof.useMutation();
  const payLinkMut = trpc.checkout.createPaymentLink.useMutation();

  const tokenForActions = useMemo(() => {
    if (activeToken) return activeToken;
    if (order?.access_token) return order.access_token;
    return "";
  }, [activeToken, order]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setUploadMsg(null);
    setPendingProof(null);
    setActiveToken("");
    setActiveCode(codeInput.trim());
  }

  async function refreshTrackedOrder() {
    // refetch() ignores `enabled` — never hit getByCode/getByToken with empty input
    // (Zod min(1) → "Too small… path: [code|token]" after proof upload).
    if (activeToken) {
      await byToken.refetch();
      return;
    }
    if (activeCode) {
      await byCode.refetch();
    }
  }

  function onPickProof(file: File | null) {
    setUploadMsg(null);
    setPendingProof(file);
  }

  async function onSendProof() {
    if (!pendingProof || !order) return;
    const orderCode = order.code?.trim() ?? "";
    if (!tokenForActions && !orderCode) {
      setUploadMsg("Falta el código o el link del pedido para subir el comprobante.");
      return;
    }
    setUploadMsg(null);
    try {
      const up = await createUpload.mutateAsync(
        tokenForActions
          ? { token: tokenForActions, fileName: pendingProof.name }
          : { code: orderCode, fileName: pendingProof.name },
      );
      const put = await fetch(up.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": pendingProof.type || "application/octet-stream" },
        body: pendingProof,
      });
      if (!put.ok) throw new Error("No se pudo subir el archivo");
      await confirmProof.mutateAsync(
        tokenForActions
          ? { token: tokenForActions, storagePath: up.path }
          : { code: orderCode, storagePath: up.path },
      );
      setPendingProof(null);
      setUploadMsg("Comprobante enviado. Te avisamos cuando confirmemos el pago.");
      setToast("Comprobante enviado");
      if (orderCode && !codeInput.trim()) setCodeInput(orderCode);
      await refreshTrackedOrder();
    } catch (e) {
      const code = domainCode(e);
      if (code === "ORDER_NOT_PENDING") setUploadMsg("El pedido ya no admite comprobante.");
      else setUploadMsg(errorMessage(e, "Error al enviar comprobante"));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold">Mi pedido</h1>
        <p className="mt-1 text-sm text-muted">
          Seguimiento con el código del mail o el link mágico.
        </p>
      </div>

      <form
        onSubmit={onLookup}
        className="rounded-[16px] border border-border bg-surface p-4"
        role="search"
      >
        <label
          htmlFor="code"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Código de pedido
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <input
            id="code"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="ACT-…"
            autoComplete="off"
            className="box-border min-h-12 w-full min-w-0 rounded-[12px] border border-border bg-surface px-4 font-mono text-base tracking-wide text-text outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            className="btn btn-primary !h-12 !min-h-12 !w-full shrink-0 px-6 sm:!w-auto sm:min-w-[7.5rem]"
          >
            Buscar
          </button>
        </div>
      </form>

      {loading ? <p className="text-sm text-muted">Buscando…</p> : null}

      {notFound ? (
        <div
          className="flex flex-col items-center rounded-[16px] border border-border bg-surface px-6 py-10 text-center"
          role="status"
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-soft text-muted"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="text-base font-bold">No encontramos ese pedido</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Revisá el código (ACT-…) del email o usá el link del mensaje de confirmación.
          </p>
        </div>
      ) : null}

      {err && !notFound ? (
        <p className="text-sm text-danger">{errorMessage(err)}</p>
      ) : null}

      {!searched && !order && !loading ? (
        <p className="text-center text-sm text-muted">
          Ingresá tu código para ver el estado y los productos.
        </p>
      ) : null}

      {order ? (
        <div className="space-y-4">
          <div className="rounded-[16px] border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-lg font-bold tracking-wide">{order.code}</p>
                <p className="text-sm text-muted">{order.customer_name}</p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                {orderStatusLabel(order.status)}
              </span>
            </div>
          </div>

          <OrderStatusBanner
            status={order.status}
            paymentMethod={order.payment_method}
            shippingMethod={order.shipping_method}
            reservationExpiresAt={order.reservation_expires_at}
            cancelReason={order.cancel_reason}
          />

          {order.status !== "cancelado" ? (
            <div className="rounded-[16px] border border-border bg-surface p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Seguimiento
              </p>
              <OrderTimeline
                status={order.status}
                shippingMethod={order.shipping_method}
              />
            </div>
          ) : null}

          <div className="space-y-1 rounded-[16px] border border-border bg-surface p-4 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Productos
            </p>
            {(order.order_items ?? []).map((it) => (
              <div key={it.id} className="flex justify-between gap-3">
                <span>
                  {it.product_name} · {it.color}/{it.size} × {it.qty}
                </span>
                <span className="shrink-0">{formatArsCents(it.unit_price_cents * it.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 font-bold">
              <span>Total</span>
              <span>{formatArsCents(order.total_cents)}</span>
            </div>
            <p className="pt-1 text-xs text-muted">
              {order.payment_method === "payway"
                ? "Payway"
                : order.payment_method === "cash"
                  ? "Efectivo"
                  : "Transferencia"}
              {" · "}
              {order.shipping_method === "pickup" ? "Retiro en local" : "Andreani"}
            </p>
          </div>

          {order.status === "pendiente_pago" &&
          order.payment_method === "payway" &&
          tokenForActions ? (
            <div className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold">Completar pago</p>
              <p className="text-xs text-muted">
                Te redirigimos al formulario seguro de Payway.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={payLinkMut.isPending}
                onClick={async () => {
                  try {
                    const res = await payLinkMut.mutateAsync({ token: tokenForActions });
                    window.location.assign(res.payment_link);
                  } catch (e) {
                    setToast(errorMessage(e, "No se pudo abrir Payway"));
                  }
                }}
              >
                {payLinkMut.isPending ? "Abriendo…" : "Pagar con Payway"}
              </button>
            </div>
          ) : null}

          {order.status === "pendiente_pago" && order.payment_method === "transfer" ? (
            <div className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold">Transferencia</p>
              {settings.data?.transfer_cbu_alias_text ? (
                <div className="rounded-[12px] border border-border bg-bg px-3 py-2">
                  <p className="text-xs text-muted">CBU / alias</p>
                  <p className="font-semibold text-text">{settings.data.transfer_cbu_alias_text}</p>
                </div>
              ) : (
                <p className="text-xs text-muted">
                  Te compartimos los datos de transferencia por email o WhatsApp si hace falta.
                </p>
              )}
              <p className="text-sm font-semibold">Subir comprobante</p>
              <p className="text-xs text-muted">
                Elegí imagen o PDF y tocá Enviar. Avisamos a la tienda para revisar el pago.
              </p>
              <label className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-border bg-surface-soft px-4 py-4 text-sm font-semibold text-accent">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  disabled={createUpload.isPending || confirmProof.isPending}
                  onChange={(e) => {
                    onPickProof(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                {pendingProof ? "Cambiar archivo" : "Elegir archivo"}
              </label>
              {pendingProof ? (
                <div className="space-y-2 rounded-[12px] border border-border bg-bg px-3 py-3">
                  <p className="truncate text-sm text-text" title={pendingProof.name}>
                    {pendingProof.name}
                  </p>
                  <p className="text-xs text-muted">
                    {(pendingProof.size / 1024).toFixed(0)} KB · listo para enviar
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      className="btn btn-primary !min-h-12 flex-1"
                      disabled={createUpload.isPending || confirmProof.isPending}
                      onClick={() => void onSendProof()}
                    >
                      {createUpload.isPending || confirmProof.isPending
                        ? "Enviando…"
                        : "Enviar comprobante"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary !min-h-12 sm:w-auto"
                      disabled={createUpload.isPending || confirmProof.isPending}
                      onClick={() => {
                        setPendingProof(null);
                        setUploadMsg(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
              {uploadMsg ? (
                <p
                  className={`text-xs ${
                    uploadMsg.includes("Error") || uploadMsg.includes("no admite")
                      ? "text-danger"
                      : "text-success"
                  }`}
                >
                  {uploadMsg}
                </p>
              ) : null}
              {(order.payment_proofs?.length ?? 0) > 0 ? (
                <p className="text-xs text-success">
                  Ya hay {order.payment_proofs!.length} comprobante(s) cargado(s).
                </p>
              ) : null}
            </div>
          ) : null}

          {order.status === "pendiente_pago" && order.payment_method === "cash" ? (
            <div className="space-y-2 rounded-[16px] border border-border bg-surface p-4">
              <p className="text-sm font-semibold">Pago en efectivo</p>
              <p className="text-xs text-muted">
                Retirás en el local (San Manuel) y pagás ahí. Te confirmamos el pago cuando cobremos.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {toast ? (
        <div
          className="pointer-events-none fixed left-1/2 z-50 max-w-[min(340px,calc(100%-32px))] -translate-x-1/2 rounded-full bg-text px-4 py-2.5 text-center text-sm text-inverse shadow-lg"
          style={{ bottom: "calc(24px + var(--safe-bottom))" }}
          role="status"
        >
          {toast}
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

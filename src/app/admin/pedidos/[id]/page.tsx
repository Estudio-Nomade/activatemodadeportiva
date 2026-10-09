"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ORDER_STATUS_LABEL, useAdminToken } from "@/lib/admin/auth";
import { domainCode, errorMessage } from "@/lib/errors";
import { formatArsCents } from "@/lib/format/money";
import { proofMediaKind } from "@/lib/media/proof-kind";
import {
  canTransition,
  type OrderStatus,
} from "@/server/domain/orders/status";
import { trpc } from "@/lib/trpc/client";

function actionErrorMessage(err: unknown): string {
  if (domainCode(err) === "INVALID_TRANSITION") {
    return "Ese paso no aplica en el estado actual del pedido. Seguí el flujo en orden.";
  }
  return errorMessage(err);
}

export default function AdminPedidoDetailPage() {
  const token = useAdminToken();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [activeProofId, setActiveProofId] = useState<string | null>(null);

  const detail = trpc.admin.orders.getById.useQuery({ id }, { enabled: !!token && !!id });
  const utils = trpc.useUtils();

  const confirmPay = trpc.admin.orders.confirmPayment.useMutation();
  const startPrep = trpc.admin.orders.startPreparing.useMutation();
  const readyPickup = trpc.admin.orders.markReadyForPickup.useMutation();
  const shipped = trpc.admin.orders.markShipped.useMutation();
  const delivered = trpc.admin.orders.markDelivered.useMutation();
  const cancel = trpc.admin.orders.cancel.useMutation();

  const order = detail.data;
  const proofs = order?.payment_proofs ?? [];
  const viewingProofId = activeProofId ?? proofs[0]?.id ?? null;
  const viewingProof = proofs.find((p) => p.id === viewingProofId) ?? proofs[0];

  const proofUrlQ = trpc.admin.orders.getProofDownloadUrl.useQuery(
    { proofId: viewingProofId! },
    { enabled: !!token && proofOpen && !!viewingProofId, staleTime: 60_000 },
  );

  const address = useMemo(() => {
    const a = order?.shipping_address as
      | { line1?: string; line2?: string; city?: string; postalCode?: string; province?: string }
      | null
      | undefined;
    if (!a) return null;
    return [a.line1, a.line2, a.city, a.postalCode, a.province].filter(Boolean).join(", ");
  }, [order?.shipping_address]);

  const rawShip = order?.shipping_method;
  const shippingMethod =
    rawShip === "andreani" || rawShip === "pickup" ? rawShip : undefined;
  const status = (order?.status ?? "pendiente_pago") as OrderStatus;
  const ctx =
    shippingMethod === "pickup" || shippingMethod === "andreani"
      ? ({ shippingMethod } as const)
      : undefined;

  const canConfirmPay =
    !!order &&
    order.payment_method !== "payway" &&
    canTransition(status, "pago_confirmado");
  const canStartPrep = !!order && canTransition(status, "preparando");
  const canReadyPickup = !!order && canTransition(status, "listo_retiro", ctx);
  const canShip = !!order && canTransition(status, "enviado", ctx);
  const canDeliver = !!order && canTransition(status, "entregado", ctx);
  const canCancel = !!order && canTransition(status, "cancelado", ctx);
  const hasNextAction =
    canConfirmPay || canStartPrep || canReadyPickup || canShip || canDeliver || canCancel;

  async function run(fn: () => Promise<unknown>, ok = "OK") {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await Promise.all([
        utils.admin.orders.getById.invalidate({ id }),
        utils.admin.orders.list.invalidate(),
      ]);
      setMsg(ok);
    } catch (e) {
      setMsg(actionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function openProof(proofId: string) {
    setActiveProofId(proofId);
    setProofOpen(true);
  }

  if (detail.isLoading) {
    return <p className="text-sm text-muted">Cargando pedido…</p>;
  }

  if (detail.isError || !order) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">{errorMessage(detail.error, "Pedido no encontrado")}</p>
        <Link href="/admin/pedidos" className="btn btn-secondary max-w-xs">
          Volver
        </Link>
      </div>
    );
  }

  const kind = viewingProof ? proofMediaKind(viewingProof.storage_path) : "other";
  const signedUrl = proofUrlQ.data?.signedUrl;
  const flowHint =
    shippingMethod === "pickup"
      ? "Flujo retiro: pago → preparando → listo retiro → entregado"
      : shippingMethod === "andreani"
        ? "Flujo envío: pago → preparando → enviado → entregado"
        : null;

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="text-sm font-semibold text-accent"
        onClick={() => router.push("/admin/pedidos")}
      >
        ← Pedidos
      </button>

      <section className="rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-lg font-bold tracking-wide">{order.code}</p>
            <p className="mt-1 text-sm text-muted">
              {new Date(order.created_at).toLocaleString("es-AR")}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              order.status === "pendiente_pago"
                ? "bg-promo/15 text-promo"
                : "bg-accent-soft text-accent"
            }`}
          >
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        {order.reservation_expires_at && order.status === "pendiente_pago" ? (
          <p className="mt-3 rounded-[12px] bg-promo/10 px-3 py-2 text-xs text-promo">
            Reserva hasta {new Date(order.reservation_expires_at).toLocaleString("es-AR")}
          </p>
        ) : null}
        {flowHint ? <p className="mt-3 text-xs text-muted">{flowHint}</p> : null}
      </section>

      <section className="space-y-1 rounded-[16px] border border-border bg-surface p-4 text-sm shadow-sm md:p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Cliente</h2>
        <p>{order.customer_name}</p>
        <p className="text-muted">{order.phone}</p>
        <p className="text-muted">{order.email}</p>
        <p className="pt-2">
          Pago: <strong>{order.payment_method}</strong>
          {order.installments != null ? ` · ${order.installments} cuota(s)` : ""}
          {" · "}
          Envío: <strong>{order.shipping_method}</strong>
        </p>
        {order.payway_payment_id ? (
          <p className="text-xs text-muted">Payway id: {order.payway_payment_id}</p>
        ) : null}
        {order.payway_site_transaction_id ? (
          <p className="text-xs text-muted">site_tx: {order.payway_site_transaction_id}</p>
        ) : null}
        {address ? <p className="text-muted">{address}</p> : null}
      </section>

      <section className="space-y-2 rounded-[16px] border border-border bg-surface p-4 text-sm shadow-sm md:p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Ítems</h2>
        <ul className="space-y-2">
          {(order.order_items ?? []).map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span>
                {it.product_name} · {it.color}/{it.size} × {it.qty}
                {it.sku ? ` · Cód. ${it.sku}` : ""}
              </span>
              <span className="font-semibold">{formatArsCents(it.unit_price_cents * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-border pt-2">
          <Row label="Subtotal" value={formatArsCents(order.subtotal_cents)} />
          <Row label="Descuento" value={`−${formatArsCents(order.discount_cents)}`} />
          <Row
            label="Envío"
            value={order.shipping_cents === 0 ? "Gratis" : formatArsCents(order.shipping_cents)}
          />
          <Row label="Total" value={formatArsCents(order.total_cents)} bold />
        </div>
      </section>

      <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Comprobante</h2>
        {proofs.length === 0 ? (
          <p className="text-sm text-muted">Sin comprobante subido.</p>
        ) : (
          <ul className="space-y-2">
            {proofs.map((p, i) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Archivo {i + 1}
                    {i === 0 ? " · último" : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(p.uploaded_at).toLocaleString("es-AR")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary w-auto min-w-[140px] px-4"
                  onClick={() => openProof(p.id)}
                >
                  Ver
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {msg ? (
        <p
          className={`text-sm ${
            msg.toLowerCase().includes("no aplica") || msg.toLowerCase().includes("error")
              ? "text-danger"
              : "text-success"
          }`}
        >
          {msg}
        </p>
      ) : null}

      <section className="space-y-2 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Próximo paso</h2>
        {!hasNextAction ? (
          <p className="rounded-[12px] border border-border bg-surface px-3 py-3 text-sm text-muted">
            No hay acciones disponibles en este estado.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {canConfirmPay ? (
              <Action
                label="Confirmar pago"
                primary
                disabled={busy}
                onClick={() => run(() => confirmPay.mutateAsync({ id }), "Pago confirmado")}
              />
            ) : null}
            {canStartPrep ? (
              <Action
                label="Marcar preparando"
                primary
                disabled={busy}
                onClick={() => run(() => startPrep.mutateAsync({ id }), "En preparación")}
              />
            ) : null}
            {canReadyPickup ? (
              <Action
                label="Listo para retiro"
                primary
                disabled={busy}
                onClick={() => run(() => readyPickup.mutateAsync({ id }), "Listo para retiro")}
              />
            ) : null}
            {canShip ? (
              <Action
                label="Marcar enviado"
                primary
                disabled={busy}
                onClick={() => run(() => shipped.mutateAsync({ id }), "Marcado enviado")}
              />
            ) : null}
            {canDeliver ? (
              <Action
                label="Marcar entregado"
                primary
                disabled={busy}
                onClick={() => run(() => delivered.mutateAsync({ id }), "Entregado")}
              />
            ) : null}
            {canCancel ? (
              <Action
                label="Cancelar pedido"
                danger
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("¿Cancelar pedido y liberar stock?")) return;
                  void run(() => cancel.mutateAsync({ id }), "Cancelado");
                }}
              />
            ) : null}
          </div>
        )}
      </section>

      {proofOpen && viewingProof ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setProofOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-3 overflow-hidden rounded-[16px] bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Comprobante de pago"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">Comprobante · {order.code}</p>
                <p className="text-xs text-muted">
                  {new Date(viewingProof.uploaded_at).toLocaleString("es-AR")}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost w-auto px-3"
                onClick={() => setProofOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="min-h-[200px] flex-1 overflow-auto rounded-[12px] border border-border bg-surface-soft">
              {proofUrlQ.isLoading ? (
                <p className="p-6 text-center text-sm text-muted">Cargando comprobante…</p>
              ) : null}
              {proofUrlQ.isError ? (
                <p className="p-6 text-center text-sm text-danger">
                  {errorMessage(proofUrlQ.error, "No se pudo firmar la URL del comprobante")}
                </p>
              ) : null}
              {signedUrl && kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt="Comprobante de pago"
                  className="mx-auto max-h-[60dvh] w-full object-contain"
                />
              ) : null}
              {signedUrl && kind === "pdf" ? (
                <iframe
                  title="Comprobante PDF"
                  src={signedUrl}
                  className="h-[60dvh] w-full rounded-[12px] bg-white"
                />
              ) : null}
              {signedUrl && kind === "other" ? (
                <div className="space-y-3 p-6 text-center text-sm">
                  <p className="text-muted">Vista previa no disponible para este tipo de archivo.</p>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary mx-auto max-w-xs"
                  >
                    Abrir archivo
                  </a>
                </div>
              ) : null}
            </div>

            {signedUrl ? (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm font-semibold text-accent"
              >
                Abrir en pestaña nueva
              </a>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {canConfirmPay ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => {
                    setProofOpen(false);
                    void run(() => confirmPay.mutateAsync({ id }), "Pago confirmado");
                  }}
                >
                  Confirmar pago
                </button>
              ) : null}
              <button type="button" className="btn btn-secondary" onClick={() => setProofOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "text-base font-bold" : ""}`}>
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span className={bold ? "text-accent" : ""}>{value}</span>
    </div>
  );
}

function Action({
  label,
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btn ${primary ? "btn-primary" : danger ? "btn-ghost text-danger" : "btn-secondary"}`}
    >
      {label}
    </button>
  );
}

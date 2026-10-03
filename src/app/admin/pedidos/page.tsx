"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IN_PROGRESS_STATUSES,
  ORDER_STATUS_LABEL,
  PENDING_STATUSES,
  useAdminToken,
} from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { formatArsCents } from "@/lib/format/money";
import { trpc } from "@/lib/trpc/client";

type Tab = "pendientes" | "en-curso" | "todos";

function PedidosInner() {
  const token = useAdminToken();
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (sp.get("tab") as Tab | null) ?? "pendientes";
  const orders = trpc.admin.orders.list.useQuery(undefined, { enabled: !!token });
  const confirmPay = trpc.admin.orders.confirmPayment.useMutation();
  const cancel = trpc.admin.orders.cancel.useMutation();
  const utils = trpc.useUtils();

  const filtered = useMemo(() => {
    const list = orders.data ?? [];
    if (tab === "pendientes") {
      return list.filter((o) => (PENDING_STATUSES as readonly string[]).includes(o.status));
    }
    if (tab === "en-curso") {
      return list.filter((o) => (IN_PROGRESS_STATUSES as readonly string[]).includes(o.status));
    }
    return list;
  }, [orders.data, tab]);

  function setTab(next: Tab) {
    router.replace(`/admin/pedidos?tab=${next}`);
  }

  async function quickConfirm(id: string) {
    await confirmPay.mutateAsync({ id });
    await utils.admin.orders.list.invalidate();
  }

  async function quickCancel(id: string) {
    if (!window.confirm("¿Cancelar este pedido y liberar stock?")) return;
    await cancel.mutateAsync({ id });
    await utils.admin.orders.list.invalidate();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["pendientes", "Pendientes"],
            ["en-curso", "En curso"],
            ["todos", "Todos"],
          ] as const
        ).map(([id, label]) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors ${
                on
                  ? "bg-accent text-inverse shadow-sm"
                  : "border border-border bg-surface text-text hover:bg-surface-soft"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {orders.isLoading ? <p className="text-sm text-muted">Cargando pedidos…</p> : null}
      {orders.isError ? (
        <p className="text-sm text-danger">{errorMessage(orders.error)}</p>
      ) : null}

      {!orders.isLoading && filtered.length === 0 ? (
        <div className="rounded-[16px] border border-border bg-surface px-4 py-12 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-2xl text-accent">
            ✓
          </div>
          <p className="mt-4 font-semibold">Sin pedidos en esta vista</p>
          <p className="mt-1 text-sm text-muted">Cuando entren compras van a aparecer acá.</p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {filtered.map((o) => (
          <li
            key={o.id}
            className="rounded-[16px] border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent-soft"
          >
            <Link href={`/admin/pedidos/${o.id}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold tracking-wide">{o.code}</p>
                  <p className="mt-1.5 text-sm text-muted">
                    {o.customer_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {o.payment_method} · {o.shipping_method}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      o.status === "pendiente_pago"
                        ? "bg-promo/15 text-promo"
                        : "bg-accent-soft text-accent"
                    }`}
                  >
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <p className="text-base font-bold text-text">{formatArsCents(o.total_cents)}</p>
                </div>
              </div>
            </Link>

            {o.status === "pendiente_pago" ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  disabled={confirmPay.isPending || cancel.isPending}
                  onClick={() => quickConfirm(o.id).catch((e) => window.alert(errorMessage(e)))}
                >
                  Confirmar pago
                </button>
                <button
                  type="button"
                  className="btn btn-ghost w-auto px-4 text-danger"
                  disabled={confirmPay.isPending || cancel.isPending}
                  onClick={() => quickCancel(o.id).catch((e) => window.alert(errorMessage(e)))}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <Link href={`/admin/pedidos/${o.id}`} className="btn btn-secondary mt-4">
                Ver detalle
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPedidosPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <PedidosInner />
    </Suspense>
  );
}

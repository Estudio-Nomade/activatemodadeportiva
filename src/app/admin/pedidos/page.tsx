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
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pendientes", "Pendientes"],
            ["en-curso", "En curso"],
            ["todos", "Todos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="chip"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {orders.isLoading ? <p className="text-sm text-muted">Cargando pedidos…</p> : null}
      {orders.isError ? (
        <p className="text-sm text-danger">{errorMessage(orders.error)}</p>
      ) : null}

      {!orders.isLoading && filtered.length === 0 ? (
        <div className="rounded-[16px] border border-border bg-surface px-4 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface-soft text-2xl">
            ✓
          </div>
          <p className="mt-4 font-semibold">Sin pedidos en esta vista</p>
          <p className="mt-1 text-sm text-muted">Cuando entren compras van a aparecer acá.</p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {filtered.map((o) => (
          <li key={o.id} className="rounded-[16px] border border-border bg-surface p-4">
            <Link href={`/admin/pedidos/${o.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold">{o.code}</p>
                  <p className="mt-1 text-sm text-muted">
                    {o.customer_name} · {o.payment_method} / {o.shipping_method}
                  </p>
                </div>
                <span className="rounded-full bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent">
                  {ORDER_STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <p className="mt-2 text-base font-bold text-accent">{formatArsCents(o.total_cents)}</p>
            </Link>

            {o.status === "pendiente_pago" ? (
              <div className="mt-3 flex gap-2">
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
              <Link
                href={`/admin/pedidos/${o.id}`}
                className="btn btn-secondary mt-3"
              >
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

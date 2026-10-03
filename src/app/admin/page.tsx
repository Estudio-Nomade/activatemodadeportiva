"use client";

import Link from "next/link";
import {
  IN_PROGRESS_STATUSES,
  ORDER_STATUS_LABEL,
  PENDING_STATUSES,
  useAdminToken,
} from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { formatArsCents } from "@/lib/format/money";
import { trpc } from "@/lib/trpc/client";

export default function AdminHomePage() {
  const token = useAdminToken();
  const orders = trpc.admin.orders.list.useQuery(undefined, { enabled: !!token });
  const catalog = trpc.admin.catalog.listProducts.useQuery(undefined, { enabled: !!token });

  const list = orders.data ?? [];
  const products = catalog.data ?? [];
  const pending = list.filter((o) => (PENDING_STATUSES as readonly string[]).includes(o.status));
  const inProgress = list.filter((o) =>
    (IN_PROGRESS_STATUSES as readonly string[]).includes(o.status),
  );
  const zeroStockVariants = products.reduce((n, p) => {
    return n + (p.product_variants ?? []).filter((v) => v.stock_on_hand <= 0).length;
  }, 0);
  const recentPending = pending.slice(0, 5);

  return (
    <div className="space-y-5">
      {orders.isError ? (
        <p className="rounded-[12px] border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {errorMessage(orders.error)} — ¿usuario en admin_profiles?
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <Metric label="Pendientes de pago" value={pending.length} href="/admin/pedidos?tab=pendientes" />
        <Metric label="En curso" value={inProgress.length} href="/admin/pedidos?tab=en-curso" />
        <Metric label="Sin stock (variantes)" value={zeroStockVariants} href="/admin/catalogo" />
        <Metric label="Productos" value={products.length} href="/admin/catalogo" />
      </section>

      {pending.length > 0 ? (
        <div className="rounded-[16px] border border-promo/30 bg-promo/10 p-4 text-sm">
          <p className="font-bold text-promo">Hay {pending.length} pedido(s) esperando confirmación de pago</p>
          <p className="mt-1 text-muted">Revisá comprobantes y confirmá para liberar la preparación.</p>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Accesos</h2>
        <div className="grid gap-2">
          <QuickLink href="/admin/pedidos?tab=pendientes" title="Ver pedidos pendientes" desc="Confirmar o cancelar" />
          <QuickLink href="/admin/catalogo" title="Catálogo" desc="Stock y publicación" />
          <QuickLink href="/admin/catalogo/nuevo" title="Nuevo producto" desc="Alta con variantes" />
          <QuickLink href="/admin/categorias" title="Categorías" desc="Árbol mujer / hombre / accesorios" />
          <QuickLink href="/admin/guias" title="Guías de talles" desc="Tablas Magher / Sox e imágenes" />
          <QuickLink href="/admin/config" title="Configuración" desc="Alias, descuentos, envíos" />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Últimos pendientes</h2>
          <Link href="/admin/pedidos" className="text-xs font-semibold text-accent">
            Ver todos
          </Link>
        </div>
        {orders.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
        {recentPending.length === 0 && !orders.isLoading ? (
          <p className="rounded-[12px] border border-border bg-surface p-4 text-sm text-muted">
            No hay pendientes de pago.
          </p>
        ) : null}
        <ul className="space-y-2">
          {recentPending.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/pedidos/${o.id}`}
                className="block rounded-[12px] border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold">{o.code}</span>
                  <span className="text-xs text-muted">{ORDER_STATUS_LABEL[o.status]}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {o.customer_name} · {formatArsCents(o.total_cents)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-[16px] border border-border bg-surface p-4">
      <p className="text-2xl font-bold text-accent">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[16px] border border-border bg-surface p-3"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-sm font-bold text-accent">
        →
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
    </Link>
  );
}

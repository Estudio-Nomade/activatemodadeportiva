"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  IconAlert,
  IconBox,
  IconCatalog,
  IconClipboard,
  IconFolders,
  IconPackage,
  IconPlus,
  IconRuler,
  IconSettings,
} from "@/components/admin/icons";
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
    <div className="space-y-6">
      {orders.isError ? (
        <p className="rounded-[12px] border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {errorMessage(orders.error)} — ¿usuario en admin_profiles?
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label="Pendientes de pago"
          value={pending.length}
          href="/admin/pedidos?tab=pendientes"
          Icon={IconPackage}
          highlight={pending.length > 0}
        />
        <Metric
          label="En curso"
          value={inProgress.length}
          href="/admin/pedidos?tab=en-curso"
          Icon={IconClipboard}
        />
        <Metric
          label="Sin stock (variantes)"
          value={zeroStockVariants}
          href="/admin/catalogo"
          Icon={IconBox}
          highlight={zeroStockVariants > 0}
        />
        <Metric label="Productos" value={products.length} href="/admin/catalogo" Icon={IconCatalog} />
      </section>

      {pending.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[16px] border border-promo/35 bg-promo/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-promo/15 text-promo">
              <IconAlert size={20} />
            </span>
            <div>
              <p className="font-bold text-promo">
                Hay {pending.length} pedido(s) esperando confirmación de pago
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Revisá comprobantes y confirmá para liberar la preparación.
              </p>
            </div>
          </div>
          <Link
            href="/admin/pedidos?tab=pendientes"
            className="btn btn-primary w-full shrink-0 sm:w-auto sm:px-5"
          >
            Ver pendientes
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Accesos</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <QuickLink
            href="/admin/pedidos?tab=pendientes"
            title="Ver pedidos pendientes"
            desc="Confirmar o cancelar"
            Icon={IconPackage}
          />
          <QuickLink
            href="/admin/catalogo"
            title="Catálogo"
            desc="Stock y publicación"
            Icon={IconCatalog}
          />
          <QuickLink
            href="/admin/catalogo/nuevo"
            title="Nuevo producto"
            desc="Alta con variantes"
            Icon={IconPlus}
          />
          <QuickLink
            href="/admin/categorias"
            title="Categorías"
            desc="Árbol mujer / hombre / accesorios"
            Icon={IconFolders}
          />
          <QuickLink
            href="/admin/guias"
            title="Guías de talles"
            desc="Tablas Magher / Sox e imágenes"
            Icon={IconRuler}
          />
          <QuickLink
            href="/admin/config"
            title="Configuración"
            desc="Alias, descuentos, envíos"
            Icon={IconSettings}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
            Últimos pendientes
          </h2>
          <Link href="/admin/pedidos" className="text-xs font-semibold text-accent">
            Ver todos
          </Link>
        </div>
        {orders.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
        {recentPending.length === 0 && !orders.isLoading ? (
          <p className="rounded-[16px] border border-border bg-surface p-5 text-sm text-muted shadow-sm">
            No hay pendientes de pago.
          </p>
        ) : null}
        <ul className="space-y-2">
          {recentPending.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/pedidos/${o.id}`}
                className="block rounded-[16px] border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent-soft hover:bg-accent-soft/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold">{o.code}</span>
                  <span className="rounded-full bg-promo/15 px-2.5 py-1 text-[11px] font-semibold text-promo">
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted">
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
  Icon,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[16px] border bg-surface p-4 shadow-sm transition-colors hover:border-accent-soft ${
        highlight ? "border-promo/30" : "border-border"
      }`}
    >
      <span
        className={`mb-3 grid h-9 w-9 place-items-center rounded-[10px] ${
          highlight ? "bg-promo/15 text-promo" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon size={18} />
      </span>
      <p className="text-2xl font-bold tracking-tight text-text md:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  desc,
  Icon,
}: {
  href: string;
  title: string;
  desc: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[16px] border border-border bg-surface p-3.5 shadow-sm transition-colors hover:border-accent-soft hover:bg-accent-soft/20"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-text">{title}</span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
    </Link>
  );
}

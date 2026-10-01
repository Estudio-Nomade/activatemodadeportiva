"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessInner() {
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const token = sp.get("token") ?? "";
  const href = token
    ? `/pedido?token=${encodeURIComponent(token)}`
    : `/pedido?code=${encodeURIComponent(code)}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-success">Pedido recibido</p>
      <h1 className="mt-2 text-2xl font-bold">¡Gracias por tu compra!</h1>
      <p className="mt-3 text-sm text-muted">
        Guardá tu código. También te enviamos el detalle por email (si el mail está configurado).
      </p>
      <p className="mt-6 rounded-[16px] border border-border bg-surface px-4 py-5 font-mono text-lg font-bold tracking-wide">
        {code || "—"}
      </p>
      <p className="mt-3 text-xs text-muted">
        Stock reservado 24 h mientras el pedido esté pendiente de pago.
      </p>
      <Link href={href} className="btn btn-primary mx-auto mt-6 max-w-xs">
        Ver seguimiento
      </Link>
      <Link href="/" className="btn btn-secondary mx-auto mt-3 max-w-xs">
        Seguir comprando
      </Link>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Cargando…</p>}>
      <SuccessInner />
    </Suspense>
  );
}

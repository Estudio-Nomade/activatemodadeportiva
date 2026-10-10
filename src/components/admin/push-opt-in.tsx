"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminToken } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";
import { trpc } from "@/lib/trpc/client";

type LocalPush =
  | { kind: "boot" }
  | { kind: "unsupported" }
  | { kind: "denied" }
  | { kind: "none" }
  | { kind: "local"; endpoint: string };

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function readLocalSubscription(): Promise<LocalPush> {
  if (!pushSupported()) return { kind: "unsupported" };
  if (Notification.permission === "denied") return { kind: "denied" };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub?.endpoint) return { kind: "local", endpoint: sub.endpoint };
    return { kind: "none" };
  } catch {
    return { kind: "none" };
  }
}

export function AdminPushOptIn() {
  const token = useAdminToken();
  const [local, setLocal] = useState<LocalPush>({ kind: "boot" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const endpoint = local.kind === "local" ? local.endpoint : undefined;

  const statusQ = trpc.admin.push.status.useQuery(
    { endpoint },
    { enabled: !!token && !!endpoint },
  );
  const vapidQ = trpc.admin.push.getVapidPublicKey.useQuery(undefined, {
    enabled: false,
  });
  const subscribeMut = trpc.admin.push.subscribe.useMutation();
  const unsubscribeMut = trpc.admin.push.unsubscribe.useMutation();

  const refreshLocal = useCallback(() => {
    let cancelled = false;
    void readLocalSubscription().then((next) => {
      if (!cancelled) setLocal(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    return refreshLocal();
  }, [token, refreshLocal]);

  const ui = useMemo(() => {
    if (local.kind === "boot") return "loading" as const;
    if (local.kind === "unsupported") return "unsupported" as const;
    if (local.kind === "denied") return "denied" as const;
    if (local.kind === "none") return "inactive" as const;
    if (statusQ.isLoading || statusQ.isFetching) return "loading" as const;
    if (statusQ.isError) return "inactive" as const;
    if (statusQ.data?.enabledOnDevice) return "active" as const;
    return "inactive" as const;
  }, [local, statusQ.isLoading, statusQ.isFetching, statusQ.isError, statusQ.data]);

  async function onActivate() {
    setMsg(null);
    setBusy(true);
    try {
      if (!pushSupported()) {
        setLocal({ kind: "unsupported" });
        return;
      }

      const { publicKey } = await vapidQ.refetch().then((r) => {
        if (r.error) throw r.error;
        if (!r.data?.publicKey) throw new Error("VAPID_PUBLIC_KEY not configured");
        return r.data;
      });

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setLocal({ kind: "denied" });
        return;
      }
      if (permission !== "granted") {
        setLocal({ kind: "none" });
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!json.endpoint || !p256dh || !auth) {
        throw new Error("Incomplete push subscription keys");
      }

      await subscribeMut.mutateAsync({
        endpoint: json.endpoint,
        p256dh,
        auth,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 512) : undefined,
      });

      setLocal({ kind: "local", endpoint: json.endpoint });
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate() {
    setMsg(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const ep = sub?.endpoint ?? endpoint;
      if (sub) {
        await sub.unsubscribe();
      }
      if (ep) {
        await unsubscribeMut.mutateAsync({ endpoint: ep });
      }
      setLocal({ kind: "none" });
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token) return null;

  return (
    <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4 shadow-sm md:p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">Notificaciones push</h2>
        <p className="mt-1 text-xs text-muted">
          Avisos de pedidos nuevos, pagos y stock bajo. En el celular, instalá la app Admin y
          después activá acá.
        </p>
      </div>

      {ui === "loading" ? <p className="text-sm text-muted">Cargando…</p> : null}

      {ui === "unsupported" ? (
        <p className="text-sm text-muted">Tu navegador no soporta notificaciones push.</p>
      ) : null}

      {ui === "denied" ? (
        <p className="text-sm text-muted">Activá las notificaciones en Ajustes del sistema.</p>
      ) : null}

      {ui === "active" ? (
        <div className="space-y-3">
          <p className="text-sm text-text">Notificaciones activas en este dispositivo</p>
          <button
            type="button"
            className="btn btn-secondary w-auto px-4 text-sm"
            disabled={busy}
            onClick={() => void onDeactivate()}
          >
            {busy ? "…" : "Desactivar"}
          </button>
        </div>
      ) : null}

      {ui === "inactive" ? (
        <button
          type="button"
          className="btn btn-primary w-auto px-4 text-sm !text-white"
          disabled={busy}
          onClick={() => void onActivate()}
        >
          {busy ? "Activando…" : "Activar notificaciones"}
        </button>
      ) : null}

      {msg ? <p className="text-sm text-danger">{msg}</p> : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminLogin } from "@/lib/admin/auth";
import { errorMessage } from "@/lib/errors";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminLogin(email.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setError(errorMessage(err, "No se pudo iniciar sesión"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-[16px] border border-border bg-surface p-5 shadow-sm">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Activate
        </p>
        <h1 className="mt-2 text-center text-2xl font-bold">Admin</h1>
        <p className="mt-1 text-center text-sm text-muted">Pedidos, catálogo y configuración</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Ingresando…" : "INGRESAR"}
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Usuario en Supabase Auth + fila en <code>admin_profiles</code>.
      </p>
      <Link href="/" className="mt-3 text-center text-sm font-semibold text-accent">
        ← Volver a la tienda
      </Link>
    </div>
  );
}

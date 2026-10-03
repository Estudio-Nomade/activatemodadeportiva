"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { adminLogout, useAdminSessionSync, useAdminToken } from "@/lib/admin/auth";

const NAV = [
  { href: "/admin", label: "Inicio", match: (p: string) => p === "/admin" },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    match: (p: string) => p.startsWith("/admin/pedidos"),
  },
  {
    href: "/admin/catalogo",
    label: "Catálogo",
    match: (p: string) => p.startsWith("/admin/catalogo"),
  },
  {
    href: "/admin/guias",
    label: "Talles",
    match: (p: string) => p.startsWith("/admin/guias"),
  },
  {
    href: "/admin/config",
    label: "Config",
    match: (p: string) => p.startsWith("/admin/config"),
  },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const token = useAdminToken();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  // Refresh / clear stale JWT so admin.* tRPC Bearer matches Supabase session
  useAdminSessionSync(!isLogin || !!token);

  useEffect(() => {
    if (token === null && !isLogin) {
      router.replace("/admin/login");
    }
    if (token && isLogin) {
      router.replace("/admin");
    }
  }, [token, isLogin, router]);

  if (isLogin) {
    return <main className="min-h-dvh bg-bg">{children}</main>;
  }

  if (!token) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Redirigiendo al login…</p>
      </main>
    );
  }

  const navHit = NAV.find((n) => n.match(pathname));
  const title = pathname.startsWith("/admin/guias")
    ? "Guías de talles"
    : (navHit?.label ??
      (pathname.includes("/nuevo")
        ? "Nuevo producto"
        : pathname.includes("/catalogo/")
          ? "Editar producto"
          : "Admin"));

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div
          className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Activate Admin
            </p>
            <h1 className="truncate text-lg font-bold">{title}</h1>
          </div>
          <button
            type="button"
            className="btn btn-ghost w-auto px-3 text-sm"
            onClick={async () => {
              await adminLogout();
              router.replace("/admin/login");
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="admin-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-0.5 px-1 py-2 sm:gap-1 sm:px-2">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 flex-col items-center justify-center rounded-[12px] text-xs font-semibold ${
                  active ? "bg-accent-soft text-accent" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

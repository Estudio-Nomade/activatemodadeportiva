"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { adminLogout, useAdminSessionSync, useAdminToken } from "@/lib/admin/auth";
import { IconClose, IconMenu } from "@/components/store/icons";

type NavItem = {
  href: string;
  label: string;
  match: (p: string) => boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Inicio", match: (p) => p === "/admin" },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    match: (p) => p.startsWith("/admin/pedidos"),
  },
  {
    href: "/admin/catalogo",
    label: "Catálogo",
    match: (p) => p.startsWith("/admin/catalogo"),
  },
  {
    href: "/admin/categorias",
    label: "Categorías",
    match: (p) => p.startsWith("/admin/categorias"),
  },
  {
    href: "/admin/guias",
    label: "Guías de talles",
    match: (p) => p.startsWith("/admin/guias"),
  },
  {
    href: "/admin/config",
    label: "Config",
    match: (p) => p.startsWith("/admin/config"),
  },
];

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/guias")) return "Guías de talles";
  if (pathname.includes("/nuevo")) return "Nuevo producto";
  if (pathname.includes("/catalogo/")) return "Editar producto";
  return NAV.find((n) => n.match(pathname))?.label ?? "Admin";
}

function desktopLinkClass(active: boolean) {
  return `flex min-h-11 shrink-0 items-center justify-center rounded-[12px] px-3 text-sm font-semibold ${
    active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-soft hover:text-text"
  }`;
}

function drawerLinkClass(active: boolean) {
  return `flex min-h-12 items-center rounded-[12px] px-3 text-[15px] font-semibold ${
    active ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-soft"
  }`;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const token = useAdminToken();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  /** Menu open only while path matches open-for — auto-closes on navigate. */
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === pathname;
  const menuTitleId = useId();

  useAdminSessionSync(!isLogin || !!token);

  useEffect(() => {
    if (token === null && !isLogin) router.replace("/admin/login");
    if (token && isLogin) router.replace("/admin");
  }, [token, isLogin, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  const title = pageTitle(pathname);
  const closeMenu = () => setMenuFor(null);
  const toggleMenu = () => setMenuFor((cur) => (cur === pathname ? null : pathname));

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="admin-top sticky top-0 z-30 border-b border-border bg-surface">
        <div
          className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3"
          style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
        >
          {/* Mobile hamburger — full nav drawer (no bottom bar clipping content) */}
          <button
            type="button"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] text-text hover:bg-surface-soft md:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls={menuTitleId}
            onClick={toggleMenu}
          >
            {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Activate Admin
            </p>
            <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          </div>

          <button
            type="button"
            className="btn btn-ghost hidden w-auto px-3 text-sm md:inline-flex"
            onClick={async () => {
              await adminLogout();
              router.replace("/admin/login");
            }}
          >
            Salir
          </button>
        </div>

        {/* Desktop / tablet: horizontal nav under header */}
        <nav
          className="mx-auto hidden max-w-3xl gap-1 overflow-x-auto px-4 pb-3 md:flex"
          aria-label="Admin"
        >
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link key={item.href} href={item.href} className={desktopLinkClass(active)}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* No bottom bar → normal page padding; last form actions stay visible */}
      <main className="admin-main mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-8 md:pb-10">
        {children}
      </main>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal
          aria-labelledby={menuTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#12100f66]"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <div
            className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-border bg-surface shadow-xl"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 pb-3">
              <div className="min-w-0 pl-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Menú
                </p>
                <p id={menuTitleId} className="truncate text-base font-bold text-text">
                  Activate Admin
                </p>
              </div>
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-[12px] text-text hover:bg-surface-soft"
                aria-label="Cerrar"
                onClick={closeMenu}
              >
                <IconClose size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Admin móvil">
              <ul className="space-y-1">
                {NAV.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={drawerLinkClass(active)}
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="my-3 border-t border-border" />

              <Link
                href="/admin/catalogo/nuevo"
                className={drawerLinkClass(pathname.includes("/nuevo"))}
                onClick={closeMenu}
              >
                Nuevo producto
              </Link>
              <Link href="/" className={`${drawerLinkClass(false)} mt-1`} onClick={closeMenu}>
                Ver tienda
              </Link>
            </nav>

            <div
              className="border-t border-border p-3"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  closeMenu();
                  await adminLogout();
                  router.replace("/admin/login");
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

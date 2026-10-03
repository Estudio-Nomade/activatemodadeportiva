"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, type ComponentType } from "react";
import {
  IconCatalog,
  IconClose,
  IconFolders,
  IconHome,
  IconLogout,
  IconMore,
  IconPackage,
  IconPlus,
  IconRuler,
  IconSettings,
  IconStore,
} from "@/components/admin/icons";
import { adminLogout, useAdminSessionSync, useAdminToken } from "@/lib/admin/auth";

type NavItem = {
  href: string;
  label: string;
  match: (p: string) => boolean;
  Icon: ComponentType<{ size?: number; className?: string }>;
};

const PRIMARY_TABS: NavItem[] = [
  { href: "/admin", label: "Inicio", match: (p) => p === "/admin", Icon: IconHome },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    match: (p) => p.startsWith("/admin/pedidos"),
    Icon: IconPackage,
  },
  {
    href: "/admin/catalogo",
    label: "Catálogo",
    match: (p) => p.startsWith("/admin/catalogo"),
    Icon: IconCatalog,
  },
  {
    href: "/admin/config",
    label: "Config",
    match: (p) => p.startsWith("/admin/config"),
    Icon: IconSettings,
  },
];

const SIDEBAR_NAV: NavItem[] = [
  ...PRIMARY_TABS.slice(0, 3),
  {
    href: "/admin/categorias",
    label: "Categorías",
    match: (p) => p.startsWith("/admin/categorias"),
    Icon: IconFolders,
  },
  {
    href: "/admin/guias",
    label: "Guías",
    match: (p) => p.startsWith("/admin/guias"),
    Icon: IconRuler,
  },
  PRIMARY_TABS[3]!,
];

type MoreLink = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  match?: (p: string) => boolean;
};

const MORE_LINKS: MoreLink[] = [
  {
    href: "/admin/categorias",
    label: "Categorías",
    Icon: IconFolders,
    match: (p) => p.startsWith("/admin/categorias"),
  },
  {
    href: "/admin/guias",
    label: "Guías de talles",
    Icon: IconRuler,
    match: (p) => p.startsWith("/admin/guias"),
  },
  {
    href: "/admin/catalogo/nuevo",
    label: "Nuevo producto",
    Icon: IconPlus,
    match: (p) => p.includes("/nuevo"),
  },
  { href: "/", label: "Ver tienda", Icon: IconStore },
];

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/guias")) return "Guías de talles";
  if (pathname.includes("/nuevo")) return "Nuevo producto";
  if (pathname.includes("/catalogo/") && pathname !== "/admin/catalogo") return "Editar producto";
  if (pathname.startsWith("/admin/pedidos/") && pathname !== "/admin/pedidos") return "Detalle pedido";
  if (pathname.startsWith("/admin/categorias")) return "Categorías";
  return (
    SIDEBAR_NAV.find((n) => n.match(pathname))?.label ??
    PRIMARY_TABS.find((n) => n.match(pathname))?.label ??
    "Admin"
  );
}

function sidebarLinkClass(active: boolean) {
  return `flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-sm font-semibold transition-colors ${
    active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-soft hover:text-text"
  }`;
}

function moreLinkClass(active: boolean) {
  return `flex min-h-12 items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold ${
    active ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-soft"
  }`;
}

function tabClass(active: boolean) {
  return `flex min-h-[3.25rem] min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold leading-tight ${
    active ? "text-accent" : "text-muted"
  }`;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const token = useAdminToken();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  /** Sheet open only while path matches — auto-closes on navigate without setState in effect. */
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const moreOpen = moreFor === pathname;
  const moreTitleId = useId();
  /** Mobile virtual keyboard open → hide bottom tabs (fixed bars jump mid-screen on iOS/Android). */
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useAdminSessionSync(!isLogin || !!token);

  useEffect(() => {
    if (token === null && !isLogin) router.replace("/admin/login");
    if (token && isLogin) router.replace("/admin");
  }, [token, isLogin, router]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (isLogin || typeof window === "undefined") return;

    const mq = window.matchMedia("(min-width: 768px)");
    const isDesktop = () => mq.matches;

    const measureKeyboard = () => {
      if (isDesktop()) {
        setKeyboardOpen(false);
        return;
      }
      const vv = window.visualViewport;
      if (!vv) return;
      // Layout height shrinks when the soft keyboard is up; threshold avoids URL-bar noise.
      const occluded = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOpen(occluded > 120);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isDesktop()) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.matches("input, textarea, select, [contenteditable='true']")) {
        // Delay until keyboard animation; visualViewport will confirm.
        window.setTimeout(measureKeyboard, 300);
      }
    };
    const onFocusOut = () => {
      window.setTimeout(measureKeyboard, 300);
    };

    measureKeyboard();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measureKeyboard);
    vv?.addEventListener("scroll", measureKeyboard);
    window.addEventListener("resize", measureKeyboard);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    mq.addEventListener("change", measureKeyboard);

    return () => {
      vv?.removeEventListener("resize", measureKeyboard);
      vv?.removeEventListener("scroll", measureKeyboard);
      window.removeEventListener("resize", measureKeyboard);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      mq.removeEventListener("change", measureKeyboard);
    };
  }, [isLogin]);

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
  const closeMore = () => setMoreFor(null);
  const toggleMore = () => setMoreFor((cur) => (cur === pathname ? null : pathname));

  async function handleLogout() {
    closeMore();
    await adminLogout();
    router.replace("/admin/login");
  }

  return (
    <div className="admin-shell flex h-dvh max-h-dvh flex-col overflow-hidden bg-bg md:h-auto md:max-h-none md:min-h-dvh md:flex-row md:overflow-visible">
      {/* Desktop sidebar */}
      <aside className="admin-sidebar hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex lg:w-64">
        <div
          className="border-b border-border px-4 py-5"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Activate
          </p>
          <p className="mt-0.5 text-lg font-bold text-text">Admin</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Admin">
          {SIDEBAR_NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.Icon;
            return (
              <Link key={item.href} href={item.href} className={sidebarLinkClass(active)}>
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-border" />

          <Link
            href="/admin/catalogo/nuevo"
            className="flex min-h-11 items-center gap-3 rounded-[12px] bg-accent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 hover:text-white"
            style={{ color: "#ffffff" }}
          >
            <IconPlus size={18} className="shrink-0 text-white" aria-hidden />
            Nuevo producto
          </Link>
          <Link href="/" className={sidebarLinkClass(false)}>
            <IconStore size={18} className="shrink-0" />
            Ver tienda
          </Link>
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 text-sm font-semibold text-muted hover:bg-surface-soft hover:text-text"
            onClick={() => void handleLogout()}
          >
            <IconLogout size={18} className="shrink-0" />
            Salir
          </button>
        </div>
      </aside>

      {/* Content column — scrolls; tab bar stays in flow at bottom (not position:fixed) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="admin-top sticky top-0 z-20 shrink-0 border-b border-border bg-surface md:static md:z-auto">
          <div
            className="flex items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-4"
            style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted md:hidden">
                Activate Admin
              </p>
              <h1 className="truncate text-lg font-bold leading-tight md:text-xl">{title}</h1>
            </div>

            <Link
              href="/"
              className="btn btn-ghost hidden w-auto px-3 text-sm md:inline-flex"
            >
              Ver tienda
            </Link>
            <button
              type="button"
              className="btn btn-ghost hidden w-auto px-3 text-sm md:inline-flex"
              onClick={() => void handleLogout()}
            >
              Salir
            </button>
          </div>
        </header>

        <main className="admin-main mx-auto w-full max-w-6xl min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-4 sm:px-5 md:px-6 md:pt-6 lg:max-w-7xl">
          {children}
        </main>

        {/* Mobile bottom tabs: in-flow (not fixed) so soft keyboard can't pin them mid-viewport */}
        <nav
          className={`admin-bottom-nav shrink-0 md:hidden ${keyboardOpen ? "admin-bottom-nav--keyboard" : ""}`}
          aria-label="Admin"
          aria-hidden={keyboardOpen}
        >
          {PRIMARY_TABS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={tabClass(active)}
                aria-current={active ? "page" : undefined}
                tabIndex={keyboardOpen ? -1 : undefined}
              >
                <Icon size={20} />
                <span className={active ? "font-bold" : undefined}>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={tabClass(moreOpen)}
            aria-label="Más opciones"
            aria-expanded={moreOpen}
            aria-controls={moreTitleId}
            onClick={toggleMore}
            tabIndex={keyboardOpen ? -1 : undefined}
            disabled={keyboardOpen}
          >
            <IconMore size={20} />
            <span>Más</span>
          </button>
        </nav>
      </div>

      {/* Más bottom sheet */}
      {moreOpen ? (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal
          aria-labelledby={moreTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#12100f66]"
            aria-label="Cerrar"
            onClick={closeMore}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[20px] border-t border-border bg-surface shadow-xl"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Más
                </p>
                <p id={moreTitleId} className="truncate text-base font-bold text-text">
                  Opciones
                </p>
              </div>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-[12px] text-text hover:bg-surface-soft"
                aria-label="Cerrar"
                onClick={closeMore}
              >
                <IconClose size={22} />
              </button>
            </div>

            <nav className="space-y-1 px-2 py-3" aria-label="Más opciones">
              {MORE_LINKS.map((item) => {
                const active = item.match?.(pathname) ?? false;
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={moreLinkClass(active)}
                    onClick={closeMore}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent">
                      <Icon size={18} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-3">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-surface-soft text-[15px] font-semibold text-text"
                onClick={() => void handleLogout()}
              >
                <IconLogout size={18} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

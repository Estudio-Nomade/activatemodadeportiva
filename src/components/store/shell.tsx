"use client";

import { usePathname } from "next/navigation";
import { PromoBar, StoreFooter, StoreHeader, WhatsAppFab } from "@/components/store/chrome";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Fixed-in-flow opaque chrome: never paints over hero */}
      <div className="store-chrome sticky top-0 z-50 w-full bg-surface">
        <PromoBar />
        <StoreHeader />
      </div>
      <main className="relative z-0 w-full flex-1">{children}</main>
      <StoreFooter />
      <WhatsAppFab />
    </div>
  );
}

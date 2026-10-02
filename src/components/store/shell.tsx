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
    <div className="flex min-h-dvh flex-col">
      <PromoBar />
      <StoreHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-0">{children}</main>
      <StoreFooter />
      <WhatsAppFab />
    </div>
  );
}

import type { Metadata, Viewport } from "next";
import { AdminShell } from "@/components/admin/shell";

const THEME = "#1A1816";

export const metadata: Metadata = {
  title: "Admin",
  description: "Panel Activate — pedidos, catálogo y config",
  robots: { index: false, follow: false },
  applicationName: "Activate Admin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Activate Admin",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME },
    { media: "(prefers-color-scheme: dark)", color: THEME },
  ],
  colorScheme: "light",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

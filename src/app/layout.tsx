import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { CartProvider } from "@/lib/cart/store";
import { TRPCProvider } from "@/lib/trpc/provider";
import { StoreShell } from "@/components/store/shell";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const APP_NAME = "Activate Moda Deportiva";
const APP_DESC =
  "Moda deportiva. Retiro en local o envío Andreani. Transferencia o efectivo.";
const THEME = "#1A1816";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: "%s · Activate",
  },
  description: APP_DESC,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Activate",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/icon-192.png"],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-bg text-text antialiased">
        <TRPCProvider>
          <CartProvider>
            <StoreShell>{children}</StoreShell>
          </CartProvider>
        </TRPCProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

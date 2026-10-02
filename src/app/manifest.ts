import type { MetadataRoute } from "next";

const THEME = "#1A1816";
const BG = "#F3EEE7";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Activate Moda Deportiva",
    short_name: "Activate",
    description:
      "Moda deportiva argentina. Retiro en local o envío Andreani. Transferencia o efectivo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: BG,
    theme_color: THEME,
    lang: "es-AR",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

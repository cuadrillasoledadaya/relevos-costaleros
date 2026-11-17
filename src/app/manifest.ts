import type { MetadataRoute } from "next";

const themeColor = "#5b2c87";
const backgroundColor = "#f4f2f7";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relevos de costaleros",
    short_name: "Relevos",
    description:
      "Aplicación para calcular los relevos de los costaleros de un paso, repartirlos por tramo y preparar su impresión.",
    lang: "es",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: themeColor,
    background_color: backgroundColor,
    categories: ["productivity", "utilities"],
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
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

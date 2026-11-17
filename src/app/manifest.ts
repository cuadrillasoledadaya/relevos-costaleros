import type { MetadataRoute } from "next";

const themeColor = "#171717";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relevos de costaleros",
    short_name: "Relevos",
    lang: "es",
    start_url: "/",
    display: "standalone",
    theme_color: themeColor,
    background_color: "#ffffff",
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

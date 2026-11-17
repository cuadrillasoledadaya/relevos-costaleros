import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {/* config options here */};

// Service worker de la PWA (W3). `disable` en desarrollo evita registrar el SW
// en `pnpm dev` y silencia el aviso de Turbopack; en producción (webpack)
// genera `public/sw.js` con el manifiesto de precache inyectado.
const withSerwist = withSerwistInit({
  swSrc: "src/components/shell/pwa/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  globPublicPatterns: ["icons/**", "offline.html"],
});

export default withSerwist(nextConfig);

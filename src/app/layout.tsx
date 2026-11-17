import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/shell/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Relevos de costaleros",
    template: "%s · Relevos de costaleros",
  },
  description:
    "Aplicación para calcular los relevos de los costaleros de un paso, repartirlos por tramo y preparar su impresión.",
  applicationName: "Relevos de costaleros",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Relevos",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#121016" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {/* `variant="root"` deja el shell completo para el grupo autenticado
            (`src/app/(app)/layout.tsx`), que lo monta W4 con este mismo
            componente. Aquí sólo se aporta el proveedor de avisos. */}
        <AppShell variant="root">{children}</AppShell>
      </body>
    </html>
  );
}

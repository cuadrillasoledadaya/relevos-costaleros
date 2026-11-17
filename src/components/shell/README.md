# Shell de la aplicación

Estructura de navegación y soporte de instalación de la PWA. Lo monta la unidad W4 en
`src/app/(app)/layout.tsx` (esa ruta NO es de W3).

## `AppShell`

```tsx
import { AppShell, type NavItem } from "@/components/shell";

const navegacion: NavItem[] = [
  {
    key: "cuadrillas",
    label: "Cuadrillas",
    href: "/cuadrillas",
    icon: "cuadrilla",
  },
  {
    key: "plan",
    label: "Plan de relevos",
    href: "/cuadrillas/…/plan",
    icon: "plan",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Relevos de costaleros" nav={navegacion}>
      {children}
    </AppShell>
  );
}
```

- Cabecera fija con el título y `headerActions` (acciones o avatar).
- Navegación **lateral** en escritorio (`md` y superior) y **barra inferior** en móvil, con la
  zona segura del dispositivo (`env(safe-area-inset-bottom)`).
- `nav` acepta `key`, `label`, `href`, `icon` (catálogo de `Icono`) y `exact`.
- Enlace «Saltar al contenido» y `<main id="contenido">` para lectores de pantalla.
- `variant="root"` es el modo que usa `src/app/layout.tsx`: sólo aporta el proveedor de avisos y
  el contenedor, para que el shell del grupo autenticado no quede anidado (dos `<main>`).

## `BotonInstalar`

```tsx
import { BotonInstalar } from "@/components/shell";

<BotonInstalar />; // botón «Instalar app»
```

- Captura `beforeinstallprompt` (Chromium/Android) y lanza el diálogo de instalación.
- Cuando el navegador no emite ese evento —iOS Safari— muestra la instrucción
  «Compartir → Añadir a pantalla de inicio».
- Se oculta si la app ya está instalada (`appinstalled`).

## PWA

- `src/app/manifest.ts` — manifest de la PWA (icons 192/512/maskable).
- `public/icons/` — iconos PNG generados por `src/components/shell/pwa/generar-iconos.mjs`
  (Node puro, sin dependencias binarias): `node src/components/shell/pwa/generar-iconos.mjs`.
- `public/offline.html` — página de fallback sin conexión.
- `src/components/shell/pwa/sw.ts` — service worker (precache del shell, runtime caching de
  assets estáticos y fallback offline). Se compila con el plugin de `@serwist/next`
  (configuración en `next.config.ts`).

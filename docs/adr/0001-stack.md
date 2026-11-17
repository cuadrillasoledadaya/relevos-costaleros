# ADR 0001: Next.js 15 sobre React/Vite

- **Estado:** Aceptado

## Contexto

El proyecto necesita una PWA instalable, usada principalmente desde móviles y también desde PC,
para planificar relevos. El solver se ejecutará en servidor con Node.js, la autenticación se
integrará con Supabase y el despliegue debe funcionar en Vercel. La stack también necesita
TypeScript estricto, Tailwind CSS, pruebas unitarias y E2E, y un lockfile de pnpm.

La spec cerrada de §3 elige Next.js 15 (App Router) con React 19 y TypeScript. Los motivos son
partes del contrato: Server Components por defecto; soporte de route handlers con
`runtime = "nodejs"` para el solver; middleware de Supabase mediante `@supabase/ssr`; PWA
resuelta con manifest, service worker e iconas; y despliegue nativo en Vercel sin infraestructura
adicional.

## Decisión

Usar **Next.js 15 con App Router, React 19 y TypeScript `strict`**, con
`noUncheckedIndexedAccess` habilitado. Usar Tailwind CSS v4 y un design system propio en
`src/components/ui`, sin librerías de UI de terceros.

El backend será Supabase (Postgres, Auth y RLS) y los paquetes se gestionarán con pnpm. Los tests
unitarios y de componentes usarán Vitest y Testing Library; los E2E usarán Playwright. La
calidad se controlará con ESLint flat config, Prettier, `eslint-plugin-boundaries`, Husky,
lint-staged y commitlint.

## Consecuencias

- El solver puede ejecutarse en un route handler Node.js sin abandonar el runtime de la app.
- Supabase puede integrarse con middleware y con acceso de servidor protegido por RLS.
- Vercel puede compilar y publicar previews de PR y despliegues de `main` de forma nativa.
- La PWA necesita manifest, service worker e iconas, además de una base responsive y accesible.
- Next.js aporta convenciones y acoplamiento a su runtime; las fronteras del repositorio deben
  mantenerse para que el dominio siga siendo TypeScript puro y portable.
- Las variables de entorno se separan por origen: las variables `NEXT_PUBLIC_*` llegan al
  cliente y `SUPABASE_SERVICE_ROLE_KEY` queda exclusivamente en servidor.

## Alternativas

### React + Vite

Descartada. Es adecuada para una SPA, pero no cubre de forma nativa el route handler Node.js del
solver, el middleware de Supabase ni el modelo de renderizado y despliegue de Next.js sobre
Vercel. Habría que ensamblar esas piezas por separado.

### Remix

Descartada. Puede desplegarse en Vercel y ofrece renderizado en servidor, pero no coincide con la
stack cerrada de §3 y no aporta una ventaja específica para los requisitos de Supabase y PWA de
este proyecto.

### Expo

Descartada. Está orientada a aplicaciones móviles nativas o React Native. El producto requiere
además una PWA web instalable, soporte de PC y un solver en servidor Node.js.

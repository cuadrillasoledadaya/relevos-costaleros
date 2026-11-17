# Tests de base de datos

Esta carpeta contiene la suite pgTAP para ejecutarla en Supabase cuando exista un proyecto cloud o una instancia local de Supabase CLI.

## PGlite (verificación disponible en este entorno)

La suite ejecutable en CI sin Docker está en `src/server/repos/__tests__/`. Aplica las migraciones en orden, emula `auth.users`, `auth.uid()` y los roles `anon`, `authenticated` y `service_role`, y comprueba schema, RLS, seed y repositorios:

```bash
pnpm exec vitest run src/server/repos/__tests__
```

## Supabase (pendiente hasta que exista el proyecto)

Con Supabase CLI y Docker disponibles:

```bash
supabase start
supabase db reset
supabase test db
```

`supabase test db` ejecuta los archivos pgTAP de esta carpeta contra Postgres y el servicio de autenticación reales. Queda pendiente porque este entorno no tiene Docker y el proyecto cloud de Supabase todavía no existe.

## Diferencias

- PGlite emula las piezas de Auth que intervienen en RLS; no reproduce el proveedor de correo, las sesiones OAuth ni las cookies de Supabase.
- La suite pgTAP usa el schema `auth` y la función `auth.uid()` reales de Supabase, pero no verifica la experiencia de login ni los secretos del proyecto.
- Las políticas SQL son las mismas en ambos entornos: todas autorizan con `auth.uid()` y nunca leen `current_setting(...)` directamente.

# Clientes de Supabase

- `browser.ts`: cliente de navegador con `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `server.ts`: cliente de servidor ligado a las cookies y al JWT de la petición.
- `middleware.ts`: refresca la sesión y propaga las cookies a la respuesta.
- `admin.ts`: cliente administrativo con `SUPABASE_SERVICE_ROLE_KEY`.

El cliente administrativo está reservado para operaciones de servidor que no puedan usar el JWT del usuario, como el aprovisionamiento inicial de un perfil. No debe importarse desde `src/app/**`, `src/components/**` ni middleware. Ninguna ruta actual lo consume.

La instalación del proyecto todavía no incluye `@supabase/ssr` ni `@supabase/supabase-js`. `loader.ts` carga esos módulos de forma perezosa para mantener el typecheck disponible, pero la ejecución real requiere que el orquestador añada ambas dependencias a `package.json` y `pnpm-lock.yaml`.

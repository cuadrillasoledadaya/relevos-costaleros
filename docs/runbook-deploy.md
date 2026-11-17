# Runbook de despliegue

Este runbook cubre el entorno local y el despliegue del proyecto. Ningún valor de credencial se
incluye en el repositorio.

## Estado de los servicios

- **GitHub:** el remoto `origin` ya apunta a
  `https://github.com/cuadrillasoledadaya/relevos-costaleros.git`. La plantilla de PR, el workflow de
  CI y el hook de Conventional Commits quedan prepared en el repositorio local. **PENDIENTE:** el
  usuario debe publicar los cambios, configurar la protección de `main` y revisar la primera
  ejecución de Actions.
- **Supabase:** **PENDIENTE.** No hay credenciales ni un proyecto creado. Un desarrollador con
  acceso debe crear el proyecto, cargar las tres variables y ejecutar las migraciones.
- **Vercel:** **PENDIENTE.** No hay credenciales ni un proyecto enlazado. Un desarrollador con
  acceso debe enlazar el repositorio y cargar las variables antes de publicar un preview.
- **Producción:** **PENDIENTE DE AUTORIZACIÓN DEL USUARIO.** No se despliega a producción ni se
  fusiona a `main` sin autorización explícita.

## Requisitos

- Git.
- Node.js 22 (la CI usa la misma versión; `.nvmrc` contiene `22`).
- pnpm 11 (`corepack enable` y `corepack prepare pnpm@11.8.0 --activate`).
- Docker para ejecutar Supabase local.
- Supabase CLI para `supabase start` y las migraciones.
- Vercel CLI y una sesión autenticada para el despliegue por línea de comandos.

Las CLIs de Supabase y Vercel no se instalaron durante el bootstrap de W0 porque este entorno no
cuenta con credenciales de esos servicios.

## 1. Clonar e instalar

```bash
git clone https://github.com/cuadrillasoledadaya/relevos-costaleros.git
cd relevos-costaleros
nvm use
pnpm install
```

`pnpm install` ejecuta `prepare`, que inicializa los hooks de Husky. No se deben guardar secretos
en archivos versionados.

## 2. Configurar las variables de entorno

```bash
cp .env.example .env.local
```

`.env.local` queda ignorado por Git. Editarlo y asignar exactamente estos valores:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<url-del-proyecto-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave-anon>
SUPABASE_SERVICE_ROLE_KEY=<clave-service-role>
```

`SUPABASE_SERVICE_ROLE_KEY` es exclusivamente de servidor. Nunca debe usar el prefijo
`NEXT_PUBLIC_`, copiarse al cliente ni guardarse en el repositorio.

## 3. Levantar Supabase local

Con Docker iniciado:

```bash
supabase start
supabase status -o env
```

`supabase status -o env` muestra la URL y las claves del stack local. Copiar la URL a
`NEXT_PUBLIC_SUPABASE_URL`, la clave anónima a `NEXT_PUBLIC_SUPABASE_ANON_KEY` y la clave de
service role a `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.

Para detener el stack local:

```bash
supabase stop
```

## 4. Aplicar las migraciones

**PENDIENTE (W1):** la unidad de datos debe incorporar las migraciones en `supabase/migrations/`.
Cuando existan, aplicar las pendientes en el stack local con:

```bash
supabase migration up --local
```

Para reconstruir por completo la base local, incluyendo el seed, puede usarse:

```bash
supabase db reset --local
```

Verificar el estado después de aplicar:

```bash
supabase migration list --local
```

Las migraciones aplicadas no se editan. Cada cambio posterior se agrega en un archivo nuevo.

## 5. Ejecutar la aplicación

```bash
pnpm dev
```

Abrir `http://localhost:3000`. La configuración de Next.js usa Turbopack. Para una ejecución con
las optimizaciones de producción:

```bash
pnpm build
pnpm start
```

## 6. Ejecutar las verificaciones

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para la suite E2E de W9, instalar Chromium una vez en el entorno de desarrollo y ejecutar:

```bash
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

Los binarios del navegador no se descargan durante el bootstrap de W0.

## 7. Desplegar en Vercel

### Enlazar el proyecto

Con la CLI instalada y autenticada:

```bash
vercel login
vercel link
```

**PENDIENTE:** `vercel login` y `vercel link` requieren credenciales de Vercel y autorización para
crear o seleccionar el proyecto.

### Cargar las variables de entorno

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

Ingresar cada valor de forma interactiva. No pasar secretos como argumentos en la terminal ni
guardarlos en `.env.local` para compartirlos. Si se habilita preview, cargar las mismas variables
también en el entorno `preview` de Vercel.

### Compilar y publicar

```bash
vercel pull --environment=production
vercel build
vercel deploy --prebuilt
```

El comando anterior publica un preview. Para producción:

```bash
vercel deploy --prebuilt --prod
```

**PENDIENTE DE AUTORIZACIÓN DEL USUARIO:** ejecutar el despliegue de producción y cualquier
merge a `main`.

Alternativamente, enlazar el repositorio desde la interfaz de Vercel para que cada PR cree un
preview y `main` sea el origen de producción. Aun así, la promoción a producción requiere la
autorización indicada en la spec.

## 8. GitHub Actions

El workflow `.github/workflows/ci.yml` se ejecuta en cada push y pull request dirigido a `main`.
Instala con `pnpm install --frozen-lockfile` y ejecuta, en este orden, `pnpm lint`,
`pnpm typecheck`, `pnpm test` y `pnpm build`. Usa la caché de pnpm de `setup-node` y no necesita
secrets.

Antes de abrir la primera PR:

1. Publicar el lockfile y la configuración de tooling en el mismo commit.
2. Confirmar en Actions que el workflow aparece en el commit esperado.
3. No agregar credenciales a `.env.example`; ese archivo solo contiene nombres de variables.

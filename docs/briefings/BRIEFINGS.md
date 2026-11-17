# BRIEFINGS — Proyecto "Relevos de costaleros" (PWA, multi-agente)

> Briefings listos para pegar en un subagente. Uno por unidad de trabajo (W0–W10).
> **Orden de ejecución**: W0 → (W1 ∥ W2 ∥ W3) → (W4, W5) → (W6, W7, W8) → W9 → W10.
>
> 🔒 **REGLA QUE APLICA A LOS 11 BRIEFINGS (no se puede saltar por ningún motivo)**:
> este proyecto se construye **desde cero**. Está **PROHIBIDO** usar cualquier cosa que
> pertenezca a trabajos anteriores del usuario: repositorios, carpetas, bases de datos, claves,
> rutas de API, dominios, tablas, migraciones, seeds, componentes, textos, reglas de negocio ni
> despliegues de otros proyectos, estén donde estén (locales o remotos). No clones, no leas, no
> copies, no te inspirés, no "revisá cómo lo hizo antes". La **única** fuente del dominio es
> `docs/spec/PROMPT-relevos-costaleros.md` (y en este entorno de ejecución, también
> `PROMPT-relevos-costaleros.md`). Si algo parece necesario y no está ahí, **se pregunta**.
>
> **Antes de delegar**: el orquestador copia el prompt maestro a
> `docs/spec/PROMPT-relevos-costaleros.md` dentro del repo (lo hace W0). Todos los briefings
> asumen que ese archivo existe y es la **única** fuente de verdad.
>
> **Regla de oro para todos los briefings**: un agente que no puede citingar una sección de la
> spec para justificar una decisión, **no la toma**. Pregunta en su informe de cierre.

---

## W0 · Bootstrap del repositorio

```
ROL: Eres el agente «architect» (orquestador) del proyecto Relevos de costaleros.
OBJETIVO: Dejar el repositorio `relevos-costaleros` operativo desde el primer commit: scaffold,
calidad, CI, y los tres servicios externos (GitHub, Supabase, Vercel) ya enlazados.

CONTEXTO
Proyecto PWA nuevo, desde cero. Es una app para que un capataz de costaleros de Semana Santa
calcule los relevos de un paso y reparta la hoja de relevos para imprimir. El encargo completo
está en la spec (§2) y todo el diseño (stack, modelo de datos, reglas, solver, plan multi-agente)
también. No hay código previo: arrancás vos.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original · §3 stack y variables de entorno · §5 glosario ·
§6 estructura de trabajadera · §9 pantallas · §10 modelo de datos · §13 arquitectura del repo ·
§14.1 superficies y owners · §17 prohibiciones · §18 arranque

TAREA
1. Crear el repo git `relevos-costaleros`, rama `main`.
2. Scaffold: Next.js 15 App Router + React 19 + TypeScript `strict` (con
   `noUncheckedIndexedAccess`) + Tailwind CSS v4 + ESLint flat + Prettier + Husky + lint-staged
   + commitlint (Conventional Commits). Gestor de paquetes: pnpm, lockfile commiteado.
3. Scripts que deben existir en package.json:
   - `pnpm dev`, `pnpm build`, `pnpm start`
   - `pnpm lint` (eslint .)
   - `pnpm typecheck` (tsc --noEmit)
   - `pnpm test` (vitest run)
   - `pnpm test:e2e` (playwright test)
4. `eslint-plugin-boundaries` configurado con las fronteras de §13.1: `domain` no importa nada
   del proyecto; `components/ui` no importa `domain` ni `server`; `server` importa `domain` y
   `lib`; `app` y `components/features` importan todo.
5. `.env.example` con EXACTAMENTE estas tres variables (sin valores):
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   + `.gitignore` que ignore `.env*` salvo `.env.example`.
6. GitHub: repo con `main` protegido (PR obligatoria), plantilla de PR en
   `.github/pull_request_template.md` con el checklist de §14.7, y
   `.github/workflows/ci.yml` que corra lint → typecheck → test → build en cada push y PR.
7. Supabase: proyecto creado (el usuario provee el acceso; si no lo tenés, prepará los archivos y
   dejá el paso documentado en el runbook como pendiente, sin inventar URLs ni claves).
   Inicializá `supabase/config.toml` y la carpeta `supabase/migrations/`.
8. Vercel: proyecto enlazado al repo con las variables de entorno cargadas y deploy automático en
   PR (preview) y en `main` (producción).
9. Copiar este prompt maestro LITERAL a `docs/spec/PROMPT-relevos-costaleros.md` (read-only para
   todos los agentes). Verificá que el archivo en el repo es idéntico al que te dieron.
10. `docs/glosario.md`: la tabla de términos de §5 y la estructura de puestos de §6, verbatim.
11. `docs/adr/0001-stack.md`: decisión Next.js sobre React+Vite con el motivo de §3, y las
    alternativas descartadas (React/Vite, Remix, Expo). Una decisión, su motivo, sus
    consecuencias. Máximo 1 página.
12. `docs/runbook-deploy.md`: paso a paso para clonar, configurar `.env`, levantar Supabase
    local, aplicar migraciones, correr la app y desplegar. Todo lo que un desarrollador nuevo
    necesita, sin pasos omitidos.
13. `src/app/layout.tsx` y `src/app/globals.css` mínimos pero correctos (lang="es", viewport,
    placeholders de tokens de Tailwind). `src/app/manifest.ts` placeholder válido.
    No crees `src/styles/`: los estilos de impresión son del agente «hoja» (W8).

SUPERFICIE DE EDICIÓN PERMITIDA (tuya para siempre)
  /  (configuración de la raíz: package.json, pnpm-lock.yaml, tsconfig.json, next.config.*,
      tailwind.config.*, postcss.config.*, eslint.config.*, .prettierrc*, .commitlintrc*,
      .gitignore, .env.example, .editorconfig, .nvmrc, vitest.config.ts, vitest.setup.ts)
  .github/workflows/ci.yml
  .github/pull_request_template.md
  docs/spec/**
  docs/adr/**
  src/lib/**  (salvo src/lib/schemas.ts, que es de W1, y src/lib/export/**, que es de W8)

ARCHIVOS QUE CREAS Y ENTREGAS (a partir de acá son del agente indicado)
  src/app/layout.tsx        -> agente «ui» (W3)
  src/app/globals.css       -> agente «ui» (W3)
  src/app/manifest.ts       -> agente «ui» (W3)
  docs/glosario.md          -> agente «docs» (W10) lo actualiza al final
  docs/runbook-deploy.md    -> agente «docs» (W10) lo actualiza al final
  README.md                 -> agente «docs» (W10) lo reescribe al final

CONTRATOS (leer, no modificar)
  Ninguno todavía: sos la primera unidad.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` termina con código 0.
  - `pnpm dev` levanta y `/` responde 200.
  - `git ls-files | grep -c "^\.env$"` devuelve 0 y `.env.example` SÍ está versionado.
  - `docs/spec/PROMPT-relevos-costaleros.md` es byte-idéntico al prompt maestro entregado.
  - `docs/glosario.md` contiene los 16 términos de §5 y las 3 filas de la tabla de §6.
  - El repo remoto de GitHub existe con `main` protegido y la plantilla de PR activa.
  - `.github/workflows/ci.yml` corre los 5 pasos y pasa en verde en el primer push.
  - Vercel: el repo está enlazado y hay un deploy de preview funcionando.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No implementes pantallas, dominio, migraciones ni solver: eso son W1–W8.
  - No inventes features, campos, pantallas ni reglas de relevo que no estén en la spec.
  - No commitees secretos ni valores de `.env`.
  - No merges a `main` ni despliegues a producción sin autorización explícita del usuario.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test y build en verde.
  - Todo en un commit por grupo coherente, < 400 líneas por commit, Conventional Commits:
    `chore(setup): scaffold nextjs + ts strict + tailwind + lint`
    `chore(ci): pipeline lint -> typecheck -> test -> build`
    `chore(docs): glosario, adr de stack y runbook de despliegue`
  - Rama `feat/w0-bootstrap`, PR abierta contra `main` con el checklist de §14.7.

CIERRE (respondé exactamente esto)
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida (código de salida + líneas clave).
  4. Estado de GitHub / Supabase / Vercel: qué quedó hecho y qué quedó pendiente de credenciales.
  5. Riesgos o bloqueos.
```

---

## W1 · Datos y acceso (Supabase)

```
ROL: Eres el agente «data» del proyecto Relevos de costaleros.
OBJETIVO: Implementar el modelo de datos completo en Supabase con RLS correcto y verificado, y
exponer los repositorios tipados que consume el resto de la app.

CONTEXTO
La app guarda cuadrillas, costaleros, pasos, trabajaderas, asignaciones, tramos, planes y
relevos en Supabase Postgres. Todo el schema, las políticas RLS y los índices están definidos en
la spec: no los inventes ni los amplíes. La seguridad de los datos la hace RLS (nunca el cliente),
y hay dos roles: `capataz` (dueño de la cuadrilla, control total) y `costalero` (solo lectura de
planes publicados de su cuadrilla).

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original (glosario) · §5 glosario · §7 mecánica del relevo
(cargar y pool: lo que se persiste) · §8 reglas (lo que se persiste como estado por tramo) ·
§10 modelo de datos COMPLETO (schema, índices, RLS) · §13.1 fronteras · §13.2 capas de datos ·
§15 matriz de tests · §17 prohibiciones

TAREA
1. Migraciones en `supabase/migrations/`, una por cambio, nunca editadas después de aplicadas.
   Implementan EXACTAMENTE el schema de §10 (7 tablas + `profiles`), los índices y los CHECK.
2. RLS: implementar y verificar las dos políticas de §10 (capataz dueño = control total sobre su
   cuadrilla; costalero = lectura solo de planes `publicado` de cuadrillas a las que pertenece).
   Toda tabla con datos de usuario tiene RLS activo.
3. Tests automáticos de RLS que cubran, como mínimo, estos casos:
   - un capataz puede crear y leer su propia cuadrilla;
   - un capataz NO puede leer ni escribir la cuadrilla de otro capataz;
   - un costalero NO puede leer un plan en `borrador`;
   - un costalero SÍ puede leer un plan `publicado` de su cuadrilla;
   - un costalero NO puede leer los datos de OTROS costaleros de su cuadrilla.

   **VÍA OBLIGATORIA EN ESTE ENTORNO: PGlite (`@electric-sql/pglite`)** — un Postgres embebido
   en WASM que corre en Node. En esta máquina NO hay Docker, así que `supabase start` no es
   opción, y el proyecto cloud de Supabase todavía no existe (ver NOTA DE ENTORNO más abajo).

   Procedimiento:
   - instalá `@electric-sql/pglite` como devDependency;
   - en el test, creá una instancia PGlite y aplicá las migraciones en orden leyendo los `.sql`;
   - emulá el schema `auth` de Supabase ANTES de aplicar las políticas:
     `create schema auth;`
     `create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);`
     `create or replace function auth.uid() returns uuid language sql stable as $$
       select coalesce(
         nullif(current_setting('request.jwt.claim.sub', true), ''),
         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
       )::uuid
     $$;`
   - creá los roles que usa Supabase: `anon`, `authenticated`, `service_role`
     (`create role anon nologin;` etc.);
   - **escribí todas las políticas contra `auth.uid()`**, nunca contra `current_setting(...)` a
     mano: así la misma política sirve en PGlite y en el Supabase real;
   - cada caso se verifica con `set role authenticated;` + el `sub` del usuario en
     `request.jwt.claims`, y afirmando qué filas ve y cuáles no.

   Además: los archivos de test de base de datos en `supabase/tests/*.sql` (pgTAP) para que
   cuando exista el proyecto cloud se puedan correr con `supabase test db`. Documentá en
   `supabase/tests/README.md` el comando de PGlite y el de Supabase cloud, y la diferencia.

   **NOTA DE ENTORNO**: el proyecto cloud de Supabase aún NO existe (el token disponible no tiene
   permiso de creación de proyectos). Por eso la verificación de esta unidad es contra PGlite.
   Los checks que NEED un proyecto cloud (aplicar migraciones en la nube, `supabase db seed` en
   la nube) quedan como PENDIENTES y se reportan como tales: no los digas que pasaron.
4. `supabase/seed.sql`: un conjunto de datos de demostración completo y coherente con la spec:
   1 capataz, 1 cuadrilla, 1 paso de 3 trabajaderas, ~12 costaleros repartidos en los pools
   (con las cargas y pools que hacen feasible el plan), 2 boquillas, 4 tramos
   (ordinal 1 `salida`, 2 y 3 `normal`, ordinal 4 `entrada`).
   El seed debe producir un paso que pase F-1..F-6 sin tocar nada.
5. `src/server/supabase/`: cliente de navegador (`browser.ts`), de servidor (`server.ts`) y
   helpers de middleware (`middleware.ts`) con `@supabase/ssr`. El cliente de servidor usa la
   service role key SOLO en rutas que lo justifiquen y documentadas; nunca se expone al cliente.
6. `src/server/repos/`: un repositorio por entidad (`cuadrillas`, `costaleros`, `pasos`,
   `trabajaderas`, `asignaciones`, `tramos`, `planes`, `relevos`), con funciones tipadas de
   lectura y escritura. Sin lógica de negocio dentro: solo persistencia.
7. `src/lib/schemas.ts`: schemas zod para validar entradas de escritura.
8. `src/server/repos/__tests__/`: tests de los repositorios (con el cliente de Supabase real de
   test, o con un doble si el runner no lo permite; en ese caso, decláralo en el informe).

## Deltas de ejecución (aplicar en esta corrida)
- La spec a leer está DENTRO del repo: `docs/spec/PROMPT-relevos-costaleros.md` (leé ese, no
  ninguno de fuera).
- `package.json` y `pnpm-lock.yaml` NO son tuyos: las dependencias ya están instaladas por el
  orquestador (`@electric-sql/pglite` incluida). Si te falta alguna, NO la instales: reportala en el
  cierre y seguí con el resto.
- El proyecto cloud de Supabase todavía NO existe (el token del entorno no tiene permiso de
  creación). Por eso la verificación es contra PGlite, como dice el punto 3.
- No hagas commit ni push.

SUPERFICIE DE EDICIÓN PERMITIDA
  supabase/**
  src/server/repos/**
  src/server/supabase/**
  src/lib/schemas.ts

CONTRATOS (leer, no modificar)
  §10 (schema y RLS) — es tu contrato de salida, no lo cambies sin avisar.
  `src/domain/**` (lo escribe W2): types del dominio. Si te falta un tipo, NO lo crees: anotá el
  hueco en tu informe de cierre.
  Los endpoints de §12 (los implementa W7/W8) consumirán tus repositorios.

CRITERIOS DE ACEPTACIÓN (verificables)
  - Aplicar TODAS las migraciones sobre una instancia PGlite limpia no falla nunca, y el
    schema resultante coincide con §10 tabla por tabla (verificá con un test que consulta
    information_schema y compara tabla, columnas, tipos y constraints).
  - Los 5 casos de RLS de arriba tienen test contra PGlite y están en verde.
  - `supabase/seed.sql` deja el paso del punto 4 en estado "planificable": una consulta de
    verificación (también sobre PGlite) muestra pool, carga y tramos coherentes con F-1..F-6.
  - `pnpm lint && pnpm typecheck && pnpm test` en verde.
  - Un test confirma que `SUPABASE_SERVICE_ROLE_KEY` no aparece en ningún bundle de cliente
    (basta con un test que recorra `src/app` y `src/components` buscando el literal).
  - `supabase/config.toml` existe con `project_id` y la configuración de auth local correctos.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No agregues tablas, columnas, enums, vistas o funciones fuera de §10.
  - No implementes reglas de relevo, factibilidad ni solver: eso es W2.
  - No escribas pantallas ni componentes.
  - No uses el service role key en código de cliente.
  - No inventes campos "por si acaso" (fotos, altura, peso, notas de plan): no están en §10.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test en verde; migraciones aplicadas sobre la instancia de test.
  - Tests de RLS con los 5 casos, en verde.
  - Seed de demostración listo y verificado.
  - Docstring o comentario breve en cada función de repositorio que explique qué tabla toca.
  - Commits Conventional Commits en `feat/w1-datos`: `feat(db): esquema inicial + rls por rol`,
    `feat(db): seed de demostracion`, `feat(server): repositorios tipados`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida (incluye la salida de aplicar migraciones y
     los tests de RLS).
  4. Tipos del dominio que te faltaron de W2 (si los hay).
  5. Riesgos o bloqueos.
```

---

## W2 · Núcleo de dominio y solver

```
ROL: Eres el agente «core» del proyecto Relevos de costaleros.
OBJETIVO: Implementar en TypeScript puro el modelo de dominio, las 5 reglas de relevos, las
precondiciones de factibilidad y el solver que produce el plan más equitativo posible.

CONTEXTO
Este es el corazón del producto. El encargo define 5 reglas (R1–R5) y un objetivo de equidad
(EQ). El solver tiene que: (1) encontrar un plan que cumpla R1–R4, (2) repartir los descansos lo
más igualados posible, (3) ser determinista, (4) y cuando no existe solución, decirlo con
números en lugar de devolver un plan inválido. Tu código es 100% TypeScript puro: sin React, sin
Next, sin Supabase, sin red, sin fs, sin `Date.now()`.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original (las 5 reglas, textuales) · §5 glosario ·
§6 estructura de trabajadera · §7 mecánica del relevo COMPLETO (modelo, tramos necesarios,
precondiciones F-1..F-6) · §8 las 5 reglas + EQ COMPLETO (formalización, prioridad de
optimización, qué significan salida y entrada) · §11 solver COMPLETO (API, algoritmo en dos
fases, requisitos no negociables, diagnóstico de infactibilidad) · §15 matriz de tests ·
§16.1 supuestos declarados S-1..S-7 · §17 prohibiciones

TAREA
1. `src/domain/glosario.ts`: los términos de §5 y §6 como constantes tipadas. Incluye el
   nombre del puesto que corresponde a cada posición de cada tipo de trabajadera (primera /
   última / intermedia), en el orden izquierda→derecha de §6.
2. `src/domain/modelo.ts`: los tipos del dominio. Deben calzar con las firmas de §11.1.
3. `src/domain/reglas.ts`: predicados puros y verificables:
   `checkR1(plan, input)`, `checkR2`, `checkR3`, `checkR4`, `checkR5` (devuelve valor y óptimo),
   más el cálculo de la dispersión de EQ. Cada uno con su ID en el nombre.
4. `src/domain/factibilidad.ts`: `evaluarFactibilidad(input)` que devuelve el resultado de
   F-1..F-6, y `tramosNecesarios({pool, carga})` con la fórmula de §7.3.
5. `src/domain/solver/`:
   - `prng.ts`: PRNG determinista propio (xorshift/mulberry32). PROHIBIDO `Math.random()`.
   - `busqueda.ts`: Fase A — backtracking con propagación y las podas (a) a (e) de §11.2.
   - `optimizador.ts`: Fase B — simulated annealing o tabu con los movimientos de §11.2.
   - `index.ts`: `solvePlanDeRelevos(input, opciones?)`, `verificarPlan(plan, input)`.
   - `SOLVER_VERSION` constante exportada.
6. `src/domain/solver/diagnostico.ts`: traducción de la infactibilidad a los códigos y al mensaje
   con números y sugerencia accionable de §11.4. El conjunto de códigos es CERRADO:
   `SIN_SUPLENTES`, `CUPO_INSUFICIENTE`, `CAPACIDAD_CONSECUTIVOS`, `BOQUILLAS_CONFLICTIVAS`,
   `TRAMOS_INSUFICIENTES`, `OTRO`. No inventes otros ni cambies los nombres.
7. Tests colocados en `src/domain/__tests__/`:
   - `reglas.test.ts` → T-R1, T-R2, T-R3, T-R4, T-R5 (un test por regla, y el NOMBRE del test
     referencia el ID de la regla).
   - `solver.test.ts` → T-EQ, T-DET (mismo input + mismo seed ⇒ mismo plan), T-VERIF
     (`verificarPlan` acepta el plan propio y RECHAZA un plan mutado a mano).
   - `factibilidad.test.ts` → T-FACT (cada precondición F-1..F-6 produce su diagnóstico con los
     números correctos).
   - `solver.bench.test.ts` → T-BENCH: `pool total ≤ 60` y `T ≤ 14` ⇒ < 300 ms.
   - `dominio-puro.test.ts` → recorre `src/domain/**` y falla si algún archivo importa react,
     next, @supabase/* o módulos nativos de node. (Este test es la garantía de X-5.)

## Deltas de ejecución (aplicar en esta corrida)
- La spec a leer está DENTRO del repo: `docs/spec/PROMPT-relevos-costaleros.md` (leé ese, no
  ninguno de fuera).
- `package.json` y `pnpm-lock.yaml` NO son tuyos. `vitest` ya está configurado: los tests van en
  `src/domain/__tests__/*.test.ts`. Si te falta una dependencia, NO la instales: reportala.
- `src/domain/` es una carpeta NUEVA: no hay código previo que reutilizar ni adaptar.
- No hagas commit ni push.

SUPERFICIE DE EDICIÓN PERMITIDA
  src/domain/**

CONTRATOS (leer, no modificar)
  §7, §8 y §11 son tu contrato de entrada y salida. Si necesitás cambiar una firma, NO lo
  hacés: lo reportás en el informe de cierre y el orquestador decide.
  §10: el modelo de datos que persiste W1 (tus tipos son la fuente para él, no al revés).

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm test` en verde, con los 6 archivos de test de arriba.
  - `pnpm lint && pnpm typecheck && pnpm build` en verde.
  - Un caso canónico (1 trabajadera, pool 6, carga 5, 4 tramos) devuelve un plan donde la
    dispersión de descansos dentro del pool es ≤ 1 y `checkR1..checkR4` dan `true`.
  - El mismo caso con `seed` distinto devuelve (casi siempre) otro plan, pero con el mismo seed
    devuelve SIEMPRE el mismo plan byte a byte (comparación del JSON serializado).
  - Un caso imposible (pool 5, carga 5 ⇒ r = 0) devuelve `ok: false` con
    `codigo: 'SIN_SUPLENTES'` y las cifras correctas.
  - Un caso con `T` insuficiente para 2 descansos por persona devuelve `ok: false` con
    `codigo: 'CUPO_INSUFICIENTE'` y el número de tramos que faltan en `sugerencia`.
  - El benchmark de T-BENCH pasa y su tiempo medido queda escrito en el informe de cierre.
  - `dominio-puro.test.ts` pasa: ningún archivo de `src/domain/**` importa react/next/supabase/node.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas, bases de
    datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo sale de la spec.
  - No implementes reglas extra, ni variantes "más estrictas" o "más relajadas" de R1–R5.
  - No hardcodees valores de negocio fuera de §7 y §8 (ej.: "el primer tramo es siempre el 1" en
    vez de usar `kind`).
  - No uses `Math.random()`, `Date.now()`, `crypto`, red ni fs.
  - No escribas componentes, pantallas, repositorios ni migraciones.
  - No uses un solver externo (OR-Tools, MiniZinc, ILP online): es código puro y determinista.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test, build en verde.
  - Los 6 archivos de test presentes y en verde.
  - Cada función pública de `src/domain/` tiene su tipo de retorno explícito y un comentario
    breve con el ID de la regla o de la precondición que implementa.
  - Commits Conventional Commits en `feat/w2-dominio`:
    `feat(domain): modelo, glosario y reglas R1-R5`,
    `feat(domain): factibilidad F-1 a F-6`,
    `feat(domain): solver en dos fases con busqueda y optimizacion`,
    `test(domain): suite de reglas, determinismo, benchmark y pureza`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida, con el tiempo real del benchmark.
  4. Tiempo medido para el caso canónico y para el caso 60×14.
  5. Riesgos: casos que no sabés cerrar, o supuestos S-1..S-7 que te resultan conflictivos.
```

---

## W3 · Design system, PWA y shell

```
ROL: Eres el agente «ui» del proyecto Relevos de costaleros.
OBJETIVO: Construir el design system propio, el shell de la aplicación y todo el andamiaje de
PWA (manifest, service worker, offline), para que los agentes de aplicación construyan encima
sin discutir estilos ni accesibilidad.

CONTEXTO
La app es una PWA instalable, usada principalmente desde el móvil por un capataz durante el día
de la procesión, y también desde un PC. Los componentes de este agente son la única fuente de
estilo: los agentes de aplicación (W4–W8) no crean componentes visuales nuevos, los componen.
UI en español de España. Tokens y primitivas accesibles (foco visible, navegación por teclado,
contraste AA).

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original (la app "totalmente funcional desde moviles" e
"tambien desde un pc") · §3 stack (PWA con @serwist/next, iconos 192/512/maskable) · §4 producto
(roles, uso móvil) · §5 glosario (los textos de UI usan estos términos, no otros) · §9 pantallas
(para saber qué componentes hacen falta) · §13 arquitectura y fronteras (components/ui no importa
domain ni server) · §14.1 superficies · §17 prohibiciones

TAREA
1. Tokens de diseño en `src/app/globals.css` (Tailwind v4): escala de espaciado, tipografía,
   colores (claro y oscuro), radios, sombras, z-index. Todo como variables CSS + utilidades
   Tailwind. Sin colores hardcodeados en componentes.
2. `src/components/ui/` con estas primitivas, todas con estados (default / hover / focus /
   disabled / loading / error) y accesibles:
   Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Card, Table (con
   ordenación y scroll horizontal en móvil), Tabs, Dialog (con focus trap y cierre con Esc),
   Sheet (drawer inferior, patrón móvil), Badge, Tag, Avatar (con iniciales), Toast, Alert,
   Stepper (barra de progreso del wizard), EmptyState, Skeleton, Spinner, Pagination,
   FormField (label + helper + error, con a11y), ConfirmDialog.
   Cada primitiva: props tipadas, sin `any`, sin estilos inline sueltos.
3. `src/components/shell/`: AppShell con cabecera, navegación y zona de contenido; navegación
   responsive (barra inferior en móvil, lateral en desktop); componente `BotonInstalar` que
   captura el evento `beforeinstallprompt` y muestra la instrucción de iOS cuando no hay evento.
4. PWA:
   - `src/app/manifest.ts` con name, short_name, description, lang "es", start_url, scope,
     display "standalone", theme_color, background_color e iconos 192, 512 y maskable 512.
   - `public/icons/`: generar los PNG (192, 512, maskable 512, apple-touch-icon 180) sin
     dependencias binarias: un script propio en Node o SVG→PNG con una librería permitida y
     documentada.
   - Service worker con `@serwist/next`: precache del shell, runtime caching para assets
     estáticos, y una página de fallback offline.
5. `src/app/layout.tsx`: `lang="es"`, metadata (title, description, manifest, appleWebApp),
   viewport con `themeColor`, fuentes, y el AppShell.
6. `src/styles/` NO es tuyo. Los estilos de impresión los crea y edita el agente «hoja» (W8) en
   `src/styles/print.css`, que se importa desde su propia pantalla (en App Router se puede
   importar un stylesheet global desde cualquier layout o page). No crees ese archivo, no lo
   referencies desde `globals.css` y no lo edites nunca.
7. Storybook NO (no está en el stack).

## Deltas de ejecución (aplicar en esta corrida)
- La spec a leer está DENTRO del repo: `docs/spec/PROMPT-relevos-costaleros.md` (leé ese, no
  ninguno de fuera).
- `package.json` y `pnpm-lock.yaml` NO son tuyos: `@serwist/next` ya está instalada por el
  orquestador. Si te falta alguna dependencia, NO la instales: reportala en el cierre.
- `src/app/layout.tsx`, `src/app/globals.css` y `src/app/manifest.ts` los dejó el orquestador con
  placeholders: **reemplazalos** por tu versión (son tuyos a partir de esta unidad).
- `src/app/page.tsx` (la home del scaffold) la podés dejar o borrar: no es una pantalla de la
  spec. Si la borrás, reportalo.
- No hagas commit ni push.

SUPERFICIE DE EDICIÓN PERMITIDA
  src/components/ui/**
  src/components/shell/**
  public/**
  src/app/globals.css
  src/app/layout.tsx
  src/app/manifest.ts
  src/app/(app)/layout.tsx

CONTRATOS (leer, no modificar)
  §13.1: `components/ui` NO importa `domain` ni `server`. Tus primitivas son agnósticas del
  dominio: reciben `children`, `label`, `value`, etc. Los textos de dominio los pone el agente
  de la pantalla, no la primitiva.
  §5: el vocabulario de UI (costalero, paso, trabajadera, tramo, relevo, boquilla, capataz) es
  el de la spec. No inventes etiquetas alternativas.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm lint && pnpm typecheck && pnpm build` en verde.
  - Cada primitiva listada existe, tipada, sin `any` y sin estilos inline.
  - El build de producción genera `manifest.webmanifest` y los iconos referenciados existen en
    `public/icons/` (verificable en `dist`/`.next`).
  - Con el service worker activo, una visita repetida a `/` sirve el shell desde caché: se verifica
    con `curl -I` al archivo del service worker y con el reporte del build.
  - Todas las primitivas interactivas son alcanzables y operables solo con teclado, con foco
    visible.
  - Un check automático de contraste AA en los pares color/fondo de los tokens.
  - `src/app/layout.tsx` declara `lang="es"`.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No crees pantallas ni rutas (eso son W4–W8).
  - No añadas librerías de UI de terceros (shadcn, MUI, Chakra, Radix, headlessui).
  - No inventes tokens "por si acaso" ni un tema que no esté en la spec.
  - No edites `src/styles/print.css` ni ningún archivo de `src/styles/`: no son tuyos.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, build en verde.
  - Todas las primitivas de la lista existen y están tipadas.
  - Manifest e iconos generados y referenciados correctamente.
  - Commits Conventional Commits en `feat/w3-ui`:
    `feat(ui): tokens y primitivas base`,
    `feat(ui): primitivas de datos y feedback`,
    `feat(pwa): manifest, iconos y service worker offline`,
    `feat(ui): shell responsive con boton de instalacion`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida.
  4. Lista de primitivas entregadas y de primitivas que consideraste necesarias de más.
  5. Riesgos: contraste, foco, offline o instalabilidad en iOS.
```

---

## W4 · Auth, cuadrillas, costaleros y vista del costalero

```
ROL: Eres el agente «app» del proyecto Relevos de costaleros.
OBJETIVO: Implementar el login, la gestión de cuadrillas y costaleros, y la vista personal del
costalero. Es la puerta de entrada de la app y el CRUD que sostiene todo lo demás.

CONTEXTO
Tras el login, el capataz crea su cuadrilla (el grupo de costaleros) y da de alta a los
costaleros con nombre, apodo, teléfono y notas. El costalero, con su cuenta, entra y ve
ÚNICAMENTE su propio plan de relevos. La seguridad la pone RLS (la implementa W1): vos consumís
los repositorios y las server actions, no decides permisos a mano.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original (login, creación de la cuadrilla) · §4 producto y
roles · §5 glosario (cuadrilla, costalero, capataz) · §9 pantallas P1, P2 y P8 (con su tabla de
entradas, salidas y estados obligatorios) · §10 modelo de datos (cuadrillas, costaleros, profiles)
· §12 API (las partes de auth que te tocan) · §13.1 fronteras · §13.2 capas de datos · §15
matriz de tests · §17 prohibiciones

TAREA
1. `src/app/(auth)/login/page.tsx` (P1): login con email + contraseña y login por enlace mágico
   de Supabase. Mensajes de error en español y accionables ("ese correo no está registrado",
   "contraseña incorrecta"). Estados: carga, envío de enlace, error. Tras autenticar →
   `/cuadrillas`. Botón de instalar app reutilizando `BotonInstalar` de W3. Aviso para iOS
   ("Compartir → Añadir a pantalla de inicio") cuando no hay evento `beforeinstallprompt`.
   Incluir también el alta de cuenta nueva (rol `costalero` por defecto).
2. Middleware de sesión: refresh de sesión de Supabase y protección de rutas (todo lo que no sea
   `/login` exige sesión). Logout.
3. `src/app/(app)/cuadrillas/page.tsx` (P2): listado de cuadrillas del capataz con año y nº de
   costaleros; crear, editar y eliminar (eliminar pide confirmación).
4. Detalle de cuadrilla: alta, edición, baja y listado de costaleros (nombre, apodo, teléfono,
   notas). Un costalero no puede estar en dos cuadrillas (verificá la restricción con un test).
5. `src/app/(app)/cuadrillas/[cuadrillaId]/mi-relevo/page.tsx` (P8): la línea de tiempo de
   descansos DEL costalero que entra, con los tramos en los que le toca entrar. Muestra
   únicamente lo suyo: nada de otros costaleros ni de borradores.
6. Server actions en `src/server/actions/cuadrilla.ts` y `src/server/actions/costalero.ts`, con
   validación zod (schemas de W1) y revalidación de rutas.
7. Tests colocados junto al código (`__tests__/` en tu superficie) para: validación de forms,
   mensajes de error, y la garantía de que P8 no filtra datos de otros costaleros.

SUPERFICIE DE EDICIÓN PERMITIDA
  src/app/(auth)/**
  src/app/(app)/cuadrillas/page.tsx
  src/app/(app)/cuadrillas/nueva/**
  src/app/(app)/cuadrillas/[cuadrillaId]/page.tsx
  src/app/(app)/cuadrillas/[cuadrillaId]/costaleros/**
  src/app/(app)/cuadrillas/[cuadrillaId]/mi-relevo/**
  src/server/actions/cuadrilla.ts
  src/server/actions/costalero.ts
  src/components/features/cuadrillas/**
  src/components/features/auth/**

Lo que NO es tuyo: todo `src/app/(app)/cuadrillas/**/paso/**` es de W5 (configuración), W6
(tramos), W7 (plan) y W8 (hoja). No crees ni edites esas rutas.

CONTRATOS (leer, no modificar)
  `src/server/repos/**` y `src/lib/schemas.ts` (los escribe W1): son tu API de datos.
  `src/components/ui/**` y `src/components/shell/**` (los escribe W3): son tu API visual. No
  crees componentes visuales nuevos: componé los que hay.
  `src/domain/glosario.ts` (W2): usá los términos de §5 en los textos de UI.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde.
  - Con un usuario `costalero`, una consulta directa a la API de Supabase por un plan en
    `borrador` devuelve vacío (RLS, no filtro de UI): verificado con un test.
  - Un alta de costalero con el mismo email en dos cuadrillas es rechazada con mensaje en
    español y NO deja fila duplicada.
  - Una cuadrilla sin costaleros muestra el estado vacío con CTA, no una tabla vacía.
  - P1 y P2 funcionan con viewport de 390 px de ancho sin scroll horizontal.
  - El logout limpia la sesión y redirige a `/login`.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No inventes roles ni permisos: solo `capataz` y `costalero` (§4).
  - No implementes pasos, trabajaderas, tramos, plan ni hoja (W5–W8).
  - No escribas un filtro de permisos en el cliente como sustituto de RLS.
  - No uses emojis ni iconos de otros proyectos: definí lo que uses en W3 o texto plano.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test, build en verde.
  - Tests colocados en verde.
  - Commits Conventional Commits en `feat/w4-auth-cuadrillas`:
    `feat(auth): login con supabase y middleware de sesion`,
    `feat(cuadrillas): alta y gestion de cuadrillas y costaleros`,
    `feat(costalero): vista de mi relevo`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida.
  4. Confirmación explícita de que P8 no filtra datos ajenos, y de qué test lo prueba.
  5. Riesgos o bloqueos.
```

---

## W5 · Wizard de creación del paso

```
ROL: Eres el agente «setup» del proyecto Relevos de costaleros.
OBJETIVO: Implementar el wizard que crea y configura un paso: número de costaleros, número de
trabajaderas, reparto de costaleros por trabajadera, boquillas y tramos, con la validación de
factibilidad en vivo.

CONTEXTO
Después del login y de crear la cuadrilla, el capataz define el paso: cuántos costaleros tiene,
cuántas trabajaderas tiene y cuántos de esos costaleros van a cada trabajadera. Cada trabajadera
tiene 5 puestos y nombres propios (pateros en la primera y la última, costeros en las
intermedias). El pool de cada trabajadera es de dónde salen los relevos: si una trabajadera no
tiene suplentes, no se puede relevar y hay que avisarlo. La app calcula cuántos tramos hacen
falta para que cada costalero descanse al menos dos veces.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original (la creación del paso, el reparto por trabajadera) ·
§5 glosario · §6 estructura de trabajadera (tabla de puestos) · §7 COMPLETO (modelo pool/carga,
tramos necesarios §7.3, precondiciones F-1..F-6 §7.4) · §9 pantalla P3 (los 6 pasos) ·
§10 modelo de datos (pasos, trabajaderas, asignaciones, tramos) · §15 matriz de tests ·
§16.1 supuestos S-1, S-2, S-3, S-6, S-7 · §17 prohibiciones

TAREA
1. `src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/configuracion/page.tsx` (P3): wizard de
   6 pasos con `Stepper` de W3, navegación atrás/adelante, y guardado de estado parcial:
   - Paso 1 — datos del paso: nombre, año, nº de trabajaderas (por defecto 6, rango 1–12).
   - Paso 2 — nº de costaleros del paso y reparto por trabajadera. Por cada trabajadera se ve
     `carga` (5), `pool` y una marca roja si `pool < carga + 1` (F-4).
   - Paso 3 — asignación nominal: qué costalero va a cada pool, con el PUESTO que le corresponde
     visible (patero / costero / fijador / corriente, izquierda o derecha) según §6.
   - Paso 4 — boquillas: las 2 del paso, elegidas entre los costaleros del paso.
   - Paso 5 — tramos: cuántos hacen falta. Calculás `tramosNecesarios` por trabajadera
     (§7.3) y proponés `T = máximo` como el número de tramos del recorrido, con los nombres de
     los tramos.
   - Paso 6 — resumen y validación: checklist F-1..F-6 con semáforo. Mientras alguna precondición
     falle, el botón de calcular el plan permanece deshabilitado y se explica cuál y por qué.
2. Server actions en `src/server/actions/paso.ts` (crear/actualizar paso, asignar costaleros a
   pools, fijar boquillas) con validación zod.
3. Persistencia: `pasos`, `trabajaderas`, `asignaciones` (con `is_boquilla`) y `tramos`, según §10.
   Al cambiar el nº de trabajaderas, se recalculan los puestos y se avisa de los que quedan sin
   cubrir.
4. Reglas de asignación: un costalero en un solo pool (S-7); las boquillas son costaleros del
   paso; exactamente 2 boquillas distintas (F-5).
5. Tests colocados en tu superficie: reparto de pools, cálculo de puestos por posición, cálculo
   de `T` por trabajadera, y el bloqueo del paso al plan cuando falta un suplente.

SUPERFICIE DE EDICIÓN PERMITIDA
  src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/configuracion/**
  src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/layout.tsx
  src/components/features/configuracion/**
  src/server/actions/paso.ts

`.../paso/[pasoId]/layout.tsx` lo creás vos (cabecera del paso: nombre, selector de paso, enlaces
a Tramos / Plan / Hoja). W6, W7 y W8 solo lo leen: si necesitás cambiarlo, lo acordás con el
orquestador.

CONTRATOS (leer, no modificar)
  `src/domain/glosario.ts`, `src/domain/modelo.ts`, `src/domain/factibilidad.ts` (W2): son tu
  API de dominio. `tramosNecesarios` y `evaluarFactibilidad` ya están implementados: NO
  recalcules la fórmula en la UI.
  `src/server/repos/**` y `src/lib/schemas.ts` (W1): tu API de datos.
  `src/components/ui/**` (W3): tu API visual.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde.
  - Con 3 trabajaderas y 18 costaleros (pool 6 por trabajadera, carga 5), el paso 5 propone
    `T = 4` y muestra el detalle por trabajadera.
  - Con una trabajadera de pool 5 y carga 5, el checklist muestra F-1 en rojo con el mensaje
    "la trabajadera N no tiene suplentes" y el botón de calcular queda deshabilitado.
  - Con una cuadrilla de 10 costaleros, el paso 3 muestra el puesto correcto de cada uno
    (patero en la primera y la última trabajadera, costero en las intermedias).
  - Un costalero asignado a dos pools se rechaza y no se persiste la asignación duplicada.
  - Un paso guardado y recargado conserva exactamente lo configurado.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No implementes el cálculo del plan (W7) ni la hoja (W8).
  - No inventes reglas de relevo ni criterios de factibilidad: si falta una precondición,
    reportalo; no la escribas por tu cuenta.
  - No inventes campos en `pasos`, `trabajaderas`, `asignaciones` ni `tramos`.
  - No dupliques la fórmula de `tramosNecesarios` en un componente.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test, build en verde.
  - Tests colocados en verde.
  - Commits Conventional Commits en `feat/w5-wizard-paso`:
    `feat(paso): wizard de seis pasos con reparto por trabajadera`,
    `feat(paso): asignacion nominal con puestos y boquillas`,
    `feat(paso): calculo de tramos necesarios y checklist de factibilidad`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida.
  4. Confirma que usaste `tramosNecesarios` y `evaluarFactibilidad` de W2 y no una fórmula propia.
  5. Riesgos o bloqueos.
```

---

## W6 · Apartado de tramos

```
ROL: Eres el agente «setup» del proyecto Relevos de costaleros (misma unidad que W5, segunda
parte).
OBJETIVO: Implementar el apartado de creación de tramos: crear, nombrar, reordenar y eliminar
tramos del recorrido, con la factibilidad calculada en vivo.

CONTEXTO
El recorrido, desde la salida de la iglesia hasta la entrada, se particiona en tramos. Cada tramo
tiene nombre. El primero es la `salida` y el último es la `entrada`. El número de tramos que hace
falta no es libre: sale del cálculo de la spec §7.3 y de las precondiciones F-1..F-6. Esta
pantalla es el lugar donde el capataz ajusta ese número.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original ("un apartado para la creacion de los tramos y
asignales un nombre") · §5 glosario (tramo, salida, entrada, relevo) · §7.3 y §7.4 COMPLETO ·
§9 pantalla P4 · §10 modelo de datos (tramos) · §15 matriz de tests · §17 prohibiciones

TAREA
1. `src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/tramos/page.tsx` (P4):
   - Listado de tramos en orden, con nombre editable, botón de subir/bajar, y eliminar con
     confirmación.
   - Alta de tramo con nombre (campo obligatorio, texto libre).
   - El primer tramo se marca `salida` y el último `entrada`; el usuario puede forzar el `kind`
     manualmente y la UI avisa si queda incoherente.
   - Al cambiar el número de tramos, se recalcula la factibilidad por trabajadera en vivo.
2. Panel lateral o bloque superior con el resultado de `evaluarFactibilidad`: por trabajadera,
   `pool`, `carga`, `r`, descansos que le tocarían a cada uno, y los tramos que faltan. Con el
   semáforo de F-1..F-6.
3. Server actions en `src/server/actions/tramo.ts` (crear, renombrar, reordenar, eliminar,
   cambiar kind) con validación zod y actualización del `ordinal` de forma consistente.
4. Reordenar tramos NO debe dejar dos tramos con el mismo `ordinal` ni huecos: va transaccional.
5. Tests colocados en tu superficie: alta, renombre, reordenamiento sin colisión de ordinales,
   borrado del tramo intermedio y recálculo de la salida/entrada.

SUPERFICIE DE EDICIÓN PERMITIDA
  src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/tramos/**
  src/components/features/tramos/**
  src/server/actions/tramo.ts

CONTRATOS (leer, no modificar)
  `src/domain/factibilidad.ts` y `src/domain/modelo.ts` (W2). `tramosNecesarios` y
  `evaluarFactibilidad` ya existen: no los reimplementes.
  `src/server/repos/**` y `src/lib/schemas.ts` (W1). `src/components/ui/**` (W3).

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde.
  - Crear, renombrar, reordenar y eliminar un tramo deja la lista ordenada, sin ordinales
    repetidos ni huecos, y con `salida`/`entrada` recalculados.
  - La factibilidad mostrada cambia en la misma interacción en que se edita un tramo, sin recargar
    la página.
  - Un tramo sin nombre no se guarda y el mensaje de error está en español.
  - Con `T = 2` y pools que exigen más descansos, F-2 aparece en rojo explicando cuántos tramos
    faltan.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No implementes el plan (W7) ni la hoja (W8).
  - No inventes tipos de tramo fuera de `salida` | `normal` | `entrada`.
  - No guardes un tramo con `ordinal` duplicado.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test, build en verde.
  - Commits Conventional Commits en `feat/w6-tramos`:
    `feat(tramos): alta, renombre y borrado de tramos`,
    `feat(tramos): reordenamiento transaccional y recalculo de salida-entrada`,
    `feat(tramos): factibilidad en vivo por trabajadera`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida.
  4. Confirmación de que el reordenamiento es transaccional.
  5. Riesgos o bloqueos.
```

---

## W7 · Plan de relevos (pantalla principal) y API de cálculo

```
ROL: Eres el agente «plan» del proyecto Relevos de costaleros.
OBJETIVO: Implementar el cálculo del plan de relevos y su pantalla principal: la lógica
combinatorial que reparte los relevos lo más equitativamente posible, con estadísticas, versiones
y publicación.

CONTEXTO
Esta es la pantalla principal del producto. El capataz la usa en el móvil: pulsa "Calcular plan",
el solver (W2, en `src/domain/solver`) devuelve el reparto de descansos por tramo y por
trabajadera, y la pantalla lo muestra de dos formas (por tramo y por costalero), con las
estadísticas de equidad y el cumplimiento de R1–R5. Si el plan es imposible de calcular, la
pantalla lo dice con números y una acción concreta, no con un error genérico.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original ("la parte principal que sera el plan de relevos
... la logica combinacional para que los costaleros tengan sus relevos los mas equitativos
posible") · §5 glosario · §7 COMPLETO · §8 COMPLETO (las 5 reglas y EQ) · §9 pantalla P5 ·
§10 modelo de datos (planes, relevos) · §11 solver COMPLETO · §12 API (`POST /api/solve`,
`POST /api/planes`, `GET /api/planes`, `POST /api/planes/[id]/publicar`) · §13.1 fronteras ·
§13.3 ejecución del solver · §15 matriz de tests · §17 prohibiciones

TAREA
1. `src/app/api/solve/route.ts`: `POST /api/solve` con `export const runtime = 'nodejs'`.
   Recibe `RelevoPlanInput`, devuelve `RelevoPlanResult` (200 con `ok:true` o con `ok:false` y
   diagnóstico). Autenticación por sesión; solo el capataz de esa cuadrilla.
2. `src/app/api/planes/route.ts`: `POST /api/planes` (crea y persiste un plan nuevo: versionado
   incremental por paso, `seed`, `solver_version`, `stats` en jsonb, y las filas en `relevos`),
   `GET /api/planes?pasoId=` (historial de versiones).
   `src/app/api/planes/[id]/publicar/route.ts`: marca el plan como `publicado`.
   Persistencia en 2 pasos dentro de una transacción: `planes` + `relevos`.
3. `src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/plan/page.tsx` (P5):
   - Botón "Calcular plan de relevos", con opción de semilla (campo avanzado, valor por defecto
     20250330) y opción de "probar varias semillas y quedarse con la mejor" (T-S-6 de §11.3).
   - Vista POR TRAMO: una columna por tramo; dentro, una fila por trabajadera con los nombres de
     los que van en el paso y los que descansan.
   - Vista POR COSTALERO: una fila por costalero con los tramos en los que descansa.
   - Panel de ESTADÍSTICAS: descansos por persona, media, dispersión por pool y global,
     solapamiento salida/entrada y el cumplimiento de R1–R5.
   - HISTORIAL de versiones, con la que está publicada.
   - DIAGNÓSTICO: si `ok:false`, mostrar código, mensaje con números, y la sugerencia con un
     botón que la aplica (cambiar `T`, ampliar un pool o bajar una carga) y vuelve a calcular.
4. La pantalla NUNCA muestra un plan que no haya pasado `verificarPlan` (R1–R4): verifícalo en el
   servidor antes de persistir y antes de devolver.
5. Server actions en `src/server/actions/plan.ts`.
6. Tests colocados en tu superficie: la API devuelve el mismo resultado que `solvePlanDeRelevos`
   para la misma entrada; un plan persistido se puede leer de vuelta y `verificarPlan` lo acepta;
   publicar cambia el `status` y el costalero lo ve.

SUPERFICIE DE EDICIÓN PERMITIDA
  src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/plan/**
  src/app/api/solve/**
  src/app/api/planes/**
  src/server/actions/plan.ts
  src/components/features/plan/**

CONTRATOS (leer, no modificar)
  `src/domain/solver/**` (W2): `solvePlanDeRelevos`, `verificarPlan`, `SOLVER_VERSION` y los
  tipos de §11.1. NO reimplementes el solver ni le cambies las firmas.
  `src/server/repos/**` (W1) para persistir `planes` y `relevos`.
  `src/components/ui/**` (W3).
  La ruta `/api/export/**` es de W8: no la toques.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde.
  - `POST /api/solve` con una entrada válida devuelve 200 con `ok:true`, y con una entrada
    imposible devuelve 200 con `ok:false` y un diagnóstico con cifras.
  - `POST /api/solve` con un usuario `costalero` devuelve 403.
  - Un plan calculado y persistido se recupera de la base y `verificarPlan(plan, input)` devuelve
    `r1..r4 === true` (test que lo comprueba sobre el plan leído de la base, no solo en memoria).
  - La pantalla muestra los mismos nombres que devuelve la API (test que compara).
  - Con el plan publicado, el costalero lo ve en `/mi-relevo`; sin publicar, no.
  - La versión 2 de un plan no pisa la versión 1: el historial las lista separadas.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No reimplementes ni "mejores" el solver de W2: consumilo.
  - No ejecutes el solver en el cliente si eso rompe la frontera de `domain` (si lo hacés, es solo
    para previsualización y con el mismo resultado).
  - No inventes campos en `planes` ni en `relevos`.
  - No muestres un plan que no pase `verificarPlan`.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test, build en verde.
  - Commits Conventional Commits en `feat/w7-plan`:
    `feat(api): endpoint de calculo del plan de relevos`,
    `feat(plan): persistencia versionada de planes y relevos`,
    `feat(plan): pantalla principal con vistas por tramo y por costalero`,
    `feat(plan): estadisticas, diagnostico e historial de versiones`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida.
  4. Confirmación de que el plan mostrado pasa `verificarPlan` leído desde la base.
  5. Riesgos o bloqueos.
```

---

## W8 · Hoja de relevos del capataz y exportación

```
ROL: Eres el agente «hoja» del proyecto Relevos de costaleros.
OBJETIVO: Implementar la hoja de relevos (vista del capataz por trabajadera) y la exportación
imprimible y CSV.

CONTEXTO
El capataz necesita ver, de un vistazo y en papel, cómo queda cada trabajadera con todos los
relevos, para repartirla. La hoja es una por trabajadera: tabla de tramos × puestos con los
nombres de los costaleros. En el móvil se ve con scroll horizontal; en papel tiene que salir
limpia en A4. La exportación es el último paso del flujo: imprimir/PDF y CSV.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original ("una hoja para que el capataz vea visualmente como
queda cada trabajadera con todos los relevos ya realizados" y "la exportacion de esos relevos para
que sean imprimidos y repartidos") · §5 glosario · §6 estructura de trabajadera · §8.3 (qué es
salida y qué es entrada) · §9 pantallas P6 y P7 · §10 modelo de datos (planes, relevos, tramos) ·
§12 API (`GET /api/export/relevos.csv`, `GET /api/export/plan-por-costalero.csv`) ·
§13.1 fronteras · §15 matriz de tests · §17 prohibiciones

TAREA
1. `src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/hoja/page.tsx` (P6): una hoja por
   trabajadera, en orden de posición. Cada hoja:
   - cabecera con nombre del paso, año, nombre de la cuadrilla, fecha de generación y número de
     versión del plan;
   - tabla con los puestos en columnas (en el orden de §6: patero/costero izq, fijador izq,
     corriente, fijador der, patero/costero der) y los tramos en filas, con el nombre del costalero
     que ocupa ese puesto en ese tramo;
   - en móvil: scroll horizontal con la primera columna fija;
   - botón "Imprimir" por hoja y "Imprimir todas".
2. `src/styles/print.css`: lo creás vos (el archivo `src/styles/` todavía no existe). Contenido:
   @page A4, ocultar navegación y controles, forzar fondo blanco, tipografía de impresión, salto
   de hoja por hoja, evitar que una fila se parta a la mitad. Se importa desde la propia pantalla
   de la hoja (`import '@/styles/print.css'`), NO desde `globals.css` (que es de W3 y no se toca).
3. Exportación CSV (P7):
   - `GET /api/export/relevos.csv?planId=` → una fila por (tramo, costalero) con: tramo,
     ordinal, tipo (salida/normal/entrada), costalero, estado (en_paso/descanso), posición del
     puesto y nombre de la trabajadera.
   - `GET /api/export/plan-por-costalero.csv?planId=` → una fila por costalero con los tramos en
     los que descansa y su total de descansos.
   - Cabecera `Content-Type: text/csv; charset=utf-8`, separador `;` (Excel en español), BOM UTF-8
     para que se abra con acentos correctos, y `Content-Disposition` con nombre de archivo.
4. Botón de impresión que use `@media print` + `window.print()` (no generes PDF con una librería).
5. Tests colocados en tu superficie: el CSV tiene una fila por (tramo, costalero) y el número
   de filas es `pool × T`; los nombres de la hoja coinciden con los del plan; el CSV abre con
   acentos correctos (BOM presente).

SUPERFICIE DE EDICIÓN PERMITIDA
  src/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/hoja/**
  src/app/api/export/**
  src/lib/export/**
  src/components/features/hoja/**
  src/styles/print.css

CONTRATOS (leer, no modificar)
  `src/domain/modelo.ts` y `src/domain/glosario.ts` (W2): tipos y nombres de puesto.
  `src/server/repos/**` (W1): lees `planes`, `relevos`, `tramos`, `asignaciones`, `trabajaderas`.
  `src/components/ui/**` (W3): tu API visual.
  `src/app/globals.css` es de W3: NO lo toques. `src/styles/print.css` es tuyo y lo creás vos.
  `src/app/api/planes/**` es de W7: NO lo toques.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde.
  - Con 3 trabajaderas, la hoja muestra 3 hojas, una por trabajadera, en orden.
  - El nombre del costalero que aparece en la celda (tramo, puesto) coincide con el estado del
    plan: verificado con un test que compara la hoja contra `relevos`.
  - "Imprimir todas" produce un PDF A4 con una hoja por página (verificado generando el PDF desde
    el navegador y revisando que no hay elementos de navegación ni botones).
  - El CSV de relevos tiene exactamente `pool_total × T` filas de datos + 1 de cabecera, y la
    primera columna es el nombre del tramo.
  - El CSV se abre con acentos correctos en Excel (BOM UTF-8 presente).

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No inventes un formato de exportación extra (PDF binario, XML, etc.): solo print y CSV.
  - No uses una librería de generación de PDF.
  - No modifiques `globals.css`, `layout.tsx` ni los endpoints de planes.
  - No inventes puestos ni nombres de puesto: usá el glosario de W2.

DEFINITION OF DONE (spec §14.7)
  - lint, typecheck, test, build en verde.
  - Commits Conventional Commits en `feat/w8-hoja-export`:
    `feat(hoja): vista por trabajadera con tabla de tramos y puestos`,
    `feat(hoja): estilos de impresion A4`,
    `feat(export): csv de relevos y csv por costalero`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida.
  4. Confirmación de que el PDF impreso sale limpio en A4 (describe cómo lo verificaste).
  5. Riesgos o bloqueos.
```

---

## W9 · QA, E2E, PWA offline y CI

```
ROL: Eres el agente «qa» del proyecto Relevos de costaleros.
OBJETIVO: Cerrar la calidad del producto: el flujo completo end-to-end, la instalabilidad y el
offline de la PWA, la accesibilidad básica y el pipeline de CI que lo comprueba en cada push.

CONTEXTO
Todos los módulos están implementados (W1–W8). Tu trabajo es comprobarlos de punta a punta como
lo haría el capataz, y dejar automatizado lo que se pueda automatizar. Los E2E son tuyos y
exclusivos: los escribes en `tests/e2e/**`. Los tests unitarios y de componentes son de los
agentes de cada módulo y no se tocan.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original · §4 producto · §9 pantallas (recorrido completo) ·
§14.8 Definition of Done del proyecto · §15 matriz de tests (faltan los E2E) · §16.2 puntos
pendientes · §17 prohibiciones

TAREA
1. `playwright.config.ts`: un proyecto `chromium` (viewport 390×844, emulación móvil) y otro
   `desktop` (1280×800). Servidor de pruebas con las variables de entorno de test apuntando a la
   instancia de Supabase de pruebas. Instalar y registrar los binarios de navegador.
2. `tests/e2e/` con el flujo completo, en orden:
   - `login.spec.ts`: login correcto, credenciales incorrectas (mensaje en español), enlace
     mágico (solo el pedido, sin esperar el correo).
   - `cuadrilla.spec.ts`: crear cuadrilla, dar de alta costaleros, no poder meter el mismo
     costalero en dos cuadrillas.
   - `paso.spec.ts`: crear paso, repartir costaleros por trabajadera, comprobar que se muestran
     los puestos correctos, elegir boquillas, crear y renombrar tramos, y comprobar que el
     checklist de factibilidad bloquea el paso al plan cuando falta un suplente.
   - `plan.spec.ts`: calcular el plan, comprobar que la pantalla muestra los mismos nombres que
     devuelve `/api/solve`, comprobar el panel de estadísticas y el cumplimiento de R1–R5, y
     comprobar el caso infactible (diagnóstico visible, no pantalla de error genérica).
   - `hoja-export.spec.ts`: ver la hoja por trabajadera, imprimir (el PDF generado no debe
     contener los botones de navegación) y descargar el CSV con el número de filas esperado.
   - `costalero.spec.ts`: el costalero ve su propio plan y NO ve el de otros ni los borradores.
3. `tests/e2e/offline.spec.ts`: con el service worker activo, `context.setOffline(true)` y una
   recarga: el shell de la app carga y la última hoja visitada sigue disponible.
4. Accesibilidad básica: navegación completa por teclado en login, wizard, plan y hoja; foco
   visible; los inputs tienen label asociado; los botones de icono tienen nombre accesible. Con
   un chequeo automático (axe-core o equivalente) en las pantallas principales, con el reporte
   en `docs/a11y.md`.
5. `.github/workflows/e2e.yml`: pipeline que levanta Supabase local (o el servicio de pruebas),
   aplica migraciones, carga el seed, buildea la app y corre `pnpm test:e2e`. Secretos por
   secrets del repositorio; nunca en el YAML.
6. Rendimiento: registra los tamaños del bundle y el tiempo de carga de la pantalla de plan en
   `docs/performance.md`, con el presupuesto de §11.3 (el solver < 300 ms; el resto, lo que
   reporten las herramientas).
7. `docs/a11y.md` y `docs/performance.md` con los resultados y las incidencias abiertas.

SUPERFICIE DE EDICIÓN PERMITIDA
  tests/**
  playwright.config.ts
  .github/workflows/e2e.yml
  docs/a11y.md
  docs/performance.md

CONTRATOS (leer, no modificar)
  Los endpoints de §12 y el flujo de §9. La seed de W1 (`supabase/seed.sql`) es la fuente de
  datos de las pruebas. Si necesitás un dato que no está en el seed, agregá el fixture en
  `tests/` (tu superficie), NO edites `supabase/seed.sql` (es de W1).
  `.github/workflows/ci.yml` es del orquestador (W0): NO lo edites.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm test:e2e` en verde, con los 7 archivos de spec listados.
  - El flujo completo se ejecuta en el viewport móvil (390 px) sin errores de consola.
  - El test de offline pasa: con la red caída, el shell carga y la hoja cacheada se ve.
  - El chequeo de accesibilidad no reporta errores "serious" ni "critical" en login, wizard, plan
    y hoja; los "minor" quedan documentados en `docs/a11y.md`.
  - `.github/workflows/e2e.yml` corre en verde sobre una PR de prueba.
  - `docs/performance.md` existe con los números medidos.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No arregles bugs de otros agentes dentro de tu superficie: reportalos en el informe de cierre
    con ruta, pasos de reproducción y resultado esperado vs real.
  - No reescribas tests unitarios de otros agentes.
  - No edites `supabase/**` ni `.github/workflows/ci.yml`.
  - No introduzcas un runner de E2E distinto de Playwright.

DEFINITION OF DONE (spec §14.7)
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` en verde.
  - Commits Conventional Commits en `feat/w9-qa`:
    `test(e2e): flujo completo login a exportacion`,
    `test(e2e): caso infactible y caso de costalero`,
    `test(pwa): verificacion de offline con service worker`,
    `ci: pipeline de e2e con supabase de pruebas`,
    `docs: informe de accesibilidad y de rendimiento`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida (incluye el de `pnpm test:e2e` completo).
  4. Lista de incidencias encontradas, con ruta, reproducción y esperado vs real.
  5. Riesgos o bloqueos.
```

---

## W10 · Documentación y despliegue

```
ROL: Eres el agente «docs» del proyecto Relevos de costaleros.
OBJETIVO: Dejar el proyecto documentado para que un desarrollador nuevo lo levante y para que el
capataz sepa usarlo, y cerrar el runbook de despliegue.

CONTEXTO
El código está terminado y verificado por W9. Tu trabajo es la documentación que va con él y el
runbook de despliegue. Todo lo que afirmes debe ser verificable: si documentás un comando,
tiene que funcionar.

SPEC A LEER (docs/spec/PROMPT-relevos-costaleros.md)
§0 reglas de operación · §2 encargo original · §3 stack y variables · §4 producto · §5 glosario ·
§6 estructura de trabajadera · §7 COMPLETO (para explicar la mecánica sin inventar) ·
§8 COMPLETO (para explicar las 5 reglas) · §9 pantallas · §10 modelo de datos · §13 arquitectura ·
§14.8 Definition of Done · §17 prohibiciones

TAREA
1. `README.md`: qué es la app, para quién, captura o diagrama del flujo de pantallas, stack,
   requisitos previos, instalación, variables de entorno, comandos disponibles, estructura del
   repo, cómo correr los tests y cómo desplegar. Empezá por lo que un desconocido necesita para
   levantarla en 10 minutos.
2. `docs/glosario.md`: versión publicada del glosario de §5 y §6, en el orden de §5, con los
   términos tal cual (sin sinónimos). Es la referencia que consulta un costalero o un capataz.
3. `docs/modelo-datos.md`: el modelo de §10 explicado: cada tabla, qué representa, sus
   relaciones, y qué cambia si el capataz edita el paso (qué se recalcula).
4. `docs/guia-relevos.md`: cómo funcionan los relevos y las 5 reglas, explicadas para un capataz
   que no es programador: qué es un tramo, qué es un pool, cuándo puede y cuándo no puede
   calcular el plan, qué significa cada mensaje de diagnóstico y cómo resolverlo.
5. `docs/manual-capataz.md`: guía de uso paso a paso, desde crear la cuenta hasta imprimir la
   hoja y repartirla. Con los mensajes de error que se pueden encontrar y qué hacer.
6. `docs/runbook-deploy.md`: actualizar el que hizo W0 con el estado real: proyecto de Supabase,
   proyecto de Vercel, variables, migraciones, seed, despliegue, y cómo hacer rollback de un
   despliegue.
7. `docs/adr/`: no los toques (son del orquestador). Solo agregá ADRs nuevos si hay una decisión
   de arquitectura que quedó sin registrar, y en ese caso con el mismo formato de
   `0001-stack.md`.

SUPERFICIE DE EDICIÓN PERMITIDA
  README.md
  docs/glosario.md
  docs/modelo-datos.md
  docs/guia-relevos.md
  docs/manual-capataz.md
  docs/runbook-deploy.md

`docs/adr/**` NO es tuyo (es del orquestador): si hace falta registrar una decisión nueva,
pedila en el informe de cierre en vez de escribir el ADR.

CONTRATOS (leer, no modificar)
  Todo lo que documentes sale de la spec y del código real. Si al documentar encontrás que el
  código contradice a la spec, NO lo "arregles" documentando el código: reportalo en el informe
  de cierre como incidencia.

CRITERIOS DE ACEPTACIÓN (verificables)
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde (no tocan código, pero no
    rompés nada).
  - Cada comando que aparece en el README y en el runbook existe en `package.json` y se ejecuta
    sin error. Verificalo uno por uno.
  - `docs/glosario.md` contiene los 16 términos de §5 y las 3 filas de la tabla de §6.
  - `docs/guia-relevos.md` explica las 5 reglas sin añadir ninguna.
  - Ningún documento contiene placeholders tipo "TODO", "lorem ipsum" ni URLs de ejemplo
    inventadas: los identificadores reales de proyecto están en el runbook.
  - Un desarrollador que no conoce el proyecto puede seguir el README y llegar a `pnpm dev` con
    la app funcionando.

NO HAGAS
  - 🔒 No leas, copies ni uses nada de proyectos anteriores del usuario (repos, carpetas,
    bases de datos, rutas, dominios, seeds, componentes o reglas de otros trabajos). Todo
    sale de la spec. Este proyecto se construye desde cero.
  - No inventes functionality, endpoints, variables de entorno ni pasos de despliegue.
  - No documente reglas de relevo que no estén en §8.
  - No toques `src/**`, `supabase/**` ni `.github/**`.

DEFINITION OF DONE (spec §14.7)
  - Documentos completos y verificados comando por comando.
  - Commits Conventional Commits en `feat/w10-docs`:
    `docs(readme): guia de arranque del proyecto`,
    `docs: glosario, modelo de datos y guia de relevos`,
    `docs: manual del capataz y runbook de despliegue`.
  - PR contra `main` con el checklist de §14.7.

CIERRE
  1. Qué secciones de la spec cubriste.
  2. Qué quedó fuera y por qué.
  3. Comandos ejecutados y salida literal resumida.
  4. Incidencias detectadas entre el código y la spec (si las hay), con ruta y detalle.
  5. Riesgos o bloqueos.
```

---

## Notas para el orquestador

### Secuencia y paralelismo

```
W0 ──┬─ W1 ──┬── W4 ───────────────────┐
     ├─ W2 ──┼── W5 ── W6 ──┬── W7 ──────┤── W9 ── W10
     └─ W3 ──┴──────────────┴── W8 ─────┘
```

- **W1, W2 y W3 en paralelo**: superficies totalmente disjuntas.
- **W4** arranca cuando W1 y W3 están mergeados.
- **W5** arranca cuando W2 está mergeado (necesita `factibilidad.ts` y `glosario.ts`).
- **W6** después de W5 (comparte el modelo de paso).
- **W7 y W8** pueden ir en paralelo entre sí y con W6: tocan rutas distintas.
- **W9** cuando todo lo anterior esté mergeado.
- **W10** al final.

Si el runtime no garantiza aislamiento de escrituras, **secuencial**. Nunca dos agentes
escribiendo el repo a la vez.

### Antes de delegar cada briefing

- [ ] El briefing está completo y actualizado respecto de la spec.
- [ ] La unidad anterior está **mergeada** (no solo abierta).
- [ ] La superficie de edición no se solapa con ninguna unidad en curso.
- [ ] Los contratos que la unidad consume existen en `main` (no en una rama abierta).

### Antes de dar por buena una entrega

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde (y `pnpm test:e2e` cuando aplique).
- [ ] La superficie de edición respetada: `git diff --name-only main...` solo toca lo permitido.
- [ ] Los criterios de aceptación del briefing verificados con comando, no de palabra.
- [ ] El informe de cierre responde las 5 preguntas.

### Si una unidad se traba

1. Diagnosticar la causa: spec incompleta, contrato roto o superficie mal delimitada.
2. Ajustar el plan. **No** reintentar el mismo briefing a ciegas.
3. Si hace falta una decisión de producto, preguntar **una** vez con la opción recomendada.

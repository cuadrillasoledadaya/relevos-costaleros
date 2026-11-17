# Relevos de costaleros — PWA de gestión de relevos (Semana Santa)

Feature del proyecto `relevos-costaleros`. Fuente de verdad normativa: `docs/spec/PROMPT-relevos-costaleros.md`
(spec maestra). Este documento es el índice de trabajo: qué se pide (Specs), en qué unidades se
resuelve (Tasks) y qué pasó (Log).

---

## Specs

Cada Spec cita el texto del usuario **verbatim**. No se reinterpretan, no se amplían.

### S1 · Aplicación

> "La aplicacion quiero que se a una PWA totalmente funcional dedse moviles su principal propisito
> aunque en algunas ocasiones alguien lo usara tambien desde un pc"

PWA instalable, móvil primero, usable también desde PC. Offline: el shell y lo ya visto se
conservan sin red.

### S2 · Stack

> "su lenguaje de programacion quiero que sea react o next.js si ves algo mejor indicarcelo"

Decisión de arquitectura (ADR 0001): **Next.js 15 App Router + TypeScript**. Rationale en
`docs/adr/0001-stack.md`.

### S3 · Base de datos

> "ira enlazado con una base de datos de supabase"

Supabase Postgres + Auth + RLS. Schema en §10 de la spec.

### S4 · GitHub y Vercel

> "quiero que desde el inicio ya se cuente con github y vercel para el proyecto ya que sera asi
> como lo suba a la red para poder utilizarlo"

Repositorio GitHub con `main` protegido, CI y PRs. Proyecto Vercel enlazado al repo con variables
de entorno y deploy automático en PR y en `main`.

### S5 · Nomenclatura

> "costaleros son las personas que cargan el paso."
> "paso es la estrcutura la cual cargan los costaleros para llevar una imagen de semana santa, los
> pasos constan debajo de el de trabajaderas."
> "trabajaderas son la parte principal de un paso ahi es donde los costaleros cargan los pasos
> normalmente los pasos tienen entre 6 y 10 trabajaderas dependiendo de la longuitud del paso."
> "el boquilla costalero que manda debajo del paso es el encargado de trasmitir las ordenes del
> capataz a sus compañeros desde debajo del paso , por lo general debe haber 2 boquillas por paso"

Glosario cerrado (16 términos) en §5 de la spec. No se renombran ni se sustituyen por sinónimos.

### S6 · Puestos de una trabajadera

> "en cada trabajadera suelen ir 5 costaleros en la primera y la ultima trabajadera los costelaros
> de nombran de la siguiente manera los dos exteriores son los pateros tanto el derecho como el
> izquierdo a lado de los psteros van los fijadores que tambien hay 2 fijador derecho e izquierdo
> y en el centro el corriente despues en las trabajaderas restantes todos se llaman igual menos
> los pateros que pasan a llamerse costeros que tambien habra dos derecho e izquierdo."

5 puestos por trabajadera, en el orden izquierda→derecha. Primera y última: patero, fijador,
corriente, fijador, patero. Intermedias: costero, fijador, corriente, fijador, costero.
Tabla en §6 de la spec.

### S7 · Mecánica del relevo

> "el recorrido desde la salida de la iglesia hasta la entrada de la iglesia sera particionada en
> tramos en cada uno de los tramos saldran y entraran costaleros en las diferentes trabajaderas
> para ir relevando a sus compañeros."

Modelo pool/carga en §7 de la spec (supuesto S-1, declarado y trazable).

### S8 · Regla 1

> "Primera regla sera que los costaleros de la primera trabadera solo podran cambiarse en los
> relevos de los tramos por compañeros de su misma trabajadera siempre eso es incambiable."

### S9 · Regla 2

> "segunda regla todos los costaleros deben salir al menos dos veces durante el recorrido."

### S10 · Regla 3

> "tercera regla los costaleros no deben estar fuera dos relevos seguidos."

### S11 · Regla 4

> "cuarta regla los dos boquillas no deben coincidir fuera del paso los dos a la vez."

### S12 · Regla 5

> "quinta regla los costaleros que hagan la salida no deben hacer la entrada dentro de lo posible,
> osea seria el primer tramo y el ultimo no deberian de repetir los mismo siempre y cuando se
> pueda."

### S13 · Equidad

> "para que todos los costaletos tengan el mismo descanso dentro de lo posible"

Objetivo blando EQ: minimizar la dispersión de descansos dentro de cada pool y globalmente.

### S14 · Login

> "empezaremos con una pagina de login"

### S15 · Cuadrilla y paso

> "despues de login empezara la creacion de la cuadrilla y del paso habra que definir cuantos
> costaleros tendra el paso y cuantas trabajaderas tendra tambien ademas de luego definir que
> cantidad de costeleros definidos en el paso iran en cada trabajadera."

### S16 · Tramos

> "despues de terminar con la creacion principal del paso pasaremos a definir cuantos tramos seran
> necesarios para cada trabajadera para que cada costalero salga un minimo de 2 veces durante el
> recorrido , ademas tambien tendremos que colocar un apartado para la creacion de los tramos y
> asignales un nombre."

### S17 · Plan de relevos

> "y luegtendremos tambien la parte principal que sera el plan de relevos que ahi sera donde
> apliquemos la logica combinacional para que los costaleros temga sus relevos los mas equitativos
> posible"

### S18 · Hoja de relevos

> "por ultimo temdremos una hoja para que el capataz vea visualmente como queda cada trabajedra
> con todos los relevos ya realizados"

### S19 · Exportación

> "y por ultimo la exportacion de esos elevos para que sean imprimidos y repartidos a los
> costaleros"

---

## Tasks

| ID  | Specs                                  | Ruta                                                                                      | Unidad | Commit                                                                | Estado    |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- | --------- |
| T1  | S2, S4                                 | Bootstrap: scaffold, lint, CI, docs, spec dentro del repo                                 | W0     | `2d9c7d5`, `0c33f83`, `836d41b`, `798c8bf`                            | Hecha     |
| T2  | S3                                     | Migraciones, RLS, seed, repositorios, schemas zod                                         | W1     | `1612d61` + `fix(db): ancla de pertenencia del costalero` (L6)        | Hecha     |
| T3  | S5, S6, S7, S8, S9, S10, S11, S12, S13 | Dominio puro: glosario, modelo, reglas, factibilidad, solver                              | W2     | `1612d61`                                                             | Hecha     |
| T4  | S1, S4                                 | Design system, PWA (manifest, iconos, service worker), shell                              | W3     | `1612d61`                                                             | Hecha     |
| T5  | S14, S15                               | Login, middleware de sesión, cuadrillas, costaleros, vista del costalero                  | W4     | cadena de 7 PRs (#2 a #8) + `fix(db): indice unico parcial`           | Hecha     |
| T6  | S15, S16                               | Wizard del paso (6 pasos) con prechequeo de factibilidad                                  | W5     | cadena de 5 PRs (#9 a #13)                                            | Hecha     |
| T7  | S16                                    | Apartado de tramos: alta, nombre, orden, salida/entrada                                   | W6     | `feat(tramos): alta, renombre y borrado de tramos`                    | Pendiente |
| T8  | S13, S17                               | Plan de relevos: API de cálculo, pantalla principal, estadísticas, versiones              | W7     | `feat(plan): pantalla principal con vistas por tramo y por costalero` | Pendiente |
| T9  | S18, S19                               | Hoja por trabajadera, estilos de impresión A4, exportación CSV                            | W8     | `feat(hoja): vista por trabajadera con tabla de tramos y puestos`     | Pendiente |
| T10 | S1, S4, S9–S13                         | E2E del flujo completo, offline, accesibilidad, performance                               | W9     | `test(e2e): flujo completo login a exportacion`                       | Pendiente |
| T11 | S2, S3, S4                             | README, glosario publicado, modelo de datos, guía de relevos, manual del capataz, runbook | W10    | `docs(readme): guia de arranque del proyecto`                         | Pendiente |

---

## Log

### L1 · Encargo original (verbatim)

> como experto creador de promts vamos a crear uno para que se lo entregue a los agentes y podamos
> iniciar de 0 un proyecto dedicado a los relevos de los costaleros de semana santa.
>
> La aplicacion quiero que se a una PWA totalmente funcional dedse moviles su principal propisito
> aunque en algunas ocasiones alguien lo usara tambien desde un pc , su lenguaje de programacion
> quiero que sea react o next.js si ves algo mejor indicarcelo tambien ira enlazado con una base
> de datos de supabase , desde el principio puedes disponer de todos los datos que te hagan falta
> quiero que desde el inicio ya se cuente con github y vercel para el proyecto ya que sera asi como
> lo suba a la red para poder utilizarlo.
>
> ahora vamos a definir toda la nomenglatura que manejara el proyecto y la estructura que quiero que
> tenga, empezamos con la nomenglatura :
> costaleros son las personas que cargan el paso.
> paso es la estrcutura la cual cargan los costaleros para llevar una imagen de semana santa, los
> pasos constan debajo de el de trabajaderas.
> trabajaderas son la parte principal de un paso ahi es donde los costaleros cargan los pasos
> normalmente los pasos tienen entre 6 y 10 trabajaderas dependiendo de la longuitud del paso.
>
> ahora vamos a definir los puestos de los costaleros debajo de paso por su nomenglatura:
> en cada trabajadera suelen ir 5 costaleros en la primera y la ultima trabajadera los costelaros de
> nombran de la siguiente manera los dos exteriores son los pateros tanto el derecho como el
> izquierdo a lado de los psteros van los fijadores que tambien hay 2 fijador derecho e izquierdo y
> en el centro el corriente despues en las trabajaderas restantes todos se llaman igual menos los
> pateros que pasan a llamerse costeros que tambien habra dos derecho e izquierdo.
> el boquilla costalero que manda debajo del paso es el encargado de trasmitir las ordenes del
> capataz a sus compañeros desde debajo del paso , por lo general debe haber 2 boquillas por paso
>
> ahora vamos a explicar la forma de realizar los relevos de los costaleros para que descanses
> durante el recorrido, el recorrido desde la salida de la iglesia hasta la entrada de la iglesia
> sera particionada en tramos en cada uno de los tramos saldran y entraran costaleros en las
> diferentes trabajaderas para ir relevando a sus compañeros.
> ahora vamos con las reglas que ha de cumplir la logica combinacional y aritmetica para que todos
> los costaletos tengan el mismo descanso dentro de lo posible.
> Primera regla sera que los costaleros de la primera trabadera solo podran cambiarse en los
> relevos de los tramos por compañeros de su misma trabajadera siempre eso es incambiable.
> segunda regla todos los costaleros deben salir al menos dos veces durante el recorrido.
> tercera regla los costaleros no deben estar fuera dos relevos seguidos.
> cuarta regla los dos boquillas no deben coincidir fuera del paso los dos a la vez.
> quinta regla los costaleros que hagan la salida no deben hacer la entrada dentro de lo posible,
> osea seria el primer tramo y el ultimo no deberian de repetir los mismo siempre y cuando se
> pueda.
>
> ahora vamos a definir la estructura que quiero que tenga la aplicacion , empezaremos con una pagina
> de login, despues de login empezara la creacion de la cuadrilla y del paso habra que definir
> cuantos costaleros tendra el paso y cuantas trabajaderas tendra tambien ademas de luego definir
> que cantidad de costeleros definidos en el paso iran en cada trabajadera.
> despues de terminar con la creacion principal del paso pasaremos a definir cuantos tramos seran
> necesarios para cada trabajadera para que cada costalero salga un minimo de 2 veces durante el
> recorrido , ademas tambien tendremos que colocar un apartado para la creacion de los tramos y
> asignales un nombre.
>
> y luegtendremos tambien la parte principal que sera el plan de relevos que ahi sera donde
> apliquemos la logica combinacional para que los costaleros temga sus relevos los mas equitativos
> posible y por ultimo temdremos una hoja para que el capataz vea visualmente como queda cada
> trabajedra con todos los relevos ya realizados y por ultimo la exportacion de esos elevos para
> que sean imprimidos y repartidos a los costaleros

### L2 · Corrección del usuario sobre el alcance de la spec

El usuario corrigió el enfoque: **la spec del archivo de texto es la única fuente de verdad**. No
haber heredado reglas de dominio de proyectos anteriores del usuario, ni mencionarlos. Cualquier
punto que el archivo no define queda como supuesto declarado (§16.1 de la spec) o como punto
pendiente (§16.2), nunca se rellena con conocimiento externo.

### L3 · Decisiones de arquitectura tomadas por el orquestador

- **Next.js 15 App Router + TypeScript** sobre React/Vite (S2). Motivos en `docs/adr/0001-stack.md`.
- **Solver propio en TypeScript puro**, en dos fases (backtracking con poda → simulated
  annealing), determinista con semilla, sin dependencias nativas ni servicios externos, y con
  diagnóstico de infactibilidad en vez de devolver un plan inválido.
- **RLS verificado con PGlite**: en este entorno no hay Docker ni proyecto cloud de Supabase, y
  las políticas se escriben contra `auth.uid()` para que sirvan tal cual en producción.

### L4 · Estado de la infraestructura externa

- GitHub: repositorio `cuadrillasoledadaya/relevos-costaleros` (privado) creado y enlazado como
  `origin`. Falta activar la protección de `main` (se hace tras el primer push).
- Vercel: proyecto `relevos-costaleros` (equipo `alarmdryros-7957s-projects`) creado, enlazado al
  repo de GitHub y con deploy automático. **Faltan las variables de entorno** (dependen de S3).
- Supabase: **proyecto cloud no creado**. El token disponible solo accede al proyecto `tienda`
  (inactivo, sin API keys) y la creación de proyectos devuelve `Forbidden`; `supabase orgs list`
  no devuelve organizaciones. Requiere una intervención del usuario. Ver T10 (E2E) y T8.

### L5 · W0 cerrada; W1, W2 y W3 entregadas (2026-11-17)

- **W0 (T1)**: scaffold de Next.js 15 + TypeScript estricto (con `noUncheckedIndexedAccess`),
  Tailwind 4, Vitest, Playwright, ESLint plano con fronteras, husky + commitlint, CI y docs.
  Commits `2d9c7d5`, `0c33f83`, `836d41b`, `798c8bf`. CI verde en la primera corrida.
- **W1, W2 y W3** se lanzaron en paralelo como agentes de escritura con superficies disjuntas
  verificadas (0 solapamientos). Las tres entraron en el commit `1612d61`.
- **W3 (T4)**: 24 primitivas accesibles, tokens con contraste AA verificado por test, shell
  responsive, manifest, 4 iconos PNG generados sin dependencias binarias, favicon propio y service
  worker propio (el paquete `serwist` no se importa: en pnpm aislado solo es transitivo de
  `@serwist/next` y no se puede enlazar en el `node_modules` raíz).
- **W2 (T3)**: glosario y modelo del dominio, R1–R5, factibilidad F-1..F-6 y solver en dos fases
  (backtracking con poda + simulated annealing) con PRNG propio determinista. Seis ficheros de test.
- **W1 (T2)**: migraciones de schema y de RLS por rol, seed de demostración, pgTAP, nueve
  repositorios, clientes de Supabase y schemas zod. Verificación contra PGlite.

### L6 · Corrección del ancla de pertenencia del costalero (cierra T2)

- **Hallazgo**: la migración inicial de `costaleros` no traía `profile_id`, que §10 define como
  ancla de pertenencia, y las tres políticas del costalero quedaban atadas a
  `costaleros.id = auth.uid()`. Con esa atadura el capataz **no** podía dar de alta a un costalero
  antes de que esa persona tuviera cuenta: el id de la fila se genera al azar y nunca puede
  coincidir con el uid de la cuenta. El seed incluso documentaba el desvío como si §10 no
  incluyera la columna; era una lectura equivocada de la spec, y el test de contrato del schema se
  había escrito contra la implementación en vez de contra §10, así que no lo detectaba.
- **Corrección**: migración nueva `20250330000300_costaleros_profile_id.sql` (las migraciones no
  se editan una vez aplicadas) que añade `profile_id` y recrea las políticas del costalero contra
  ese ancla. Fixtures, seed y pgTAP actualizados: el id de la fila del costalero (`10000000-…`) es
  ahora distinto del id de su cuenta (`c0000000-…`), y el seed incluye un costalero **sin cuenta**,
  que es el flujo que describe el encargo.
- **Pruebas**: cuatro casos nuevos — la pertenencia se resuelve con `profile_id` y no con el id de
  la fila; un costalero sin cuenta no da acceso a nadie; el capataz puede dar de alta un costalero
  sin cuenta; el costalero sigue viendo su plan publicado y no ve los datos de otro.
- **Verificado**: `pnpm lint` sin errores, `pnpm typecheck` limpio, suite completa en verde y
  `pnpm build` OK.

### L7 · Corrección del estado de Vercel (deja obsoleto un punto de L4)

- El proyecto **no** quedó en el equipo `alarmdryros-7957s-projects`, donde viven las apps viejas
  del usuario: la CLI de Vercel asigna siempre al equipo actual, así que se creó un equipo nuevo
  `relevos-costaleros` (plan pro) y el proyecto está dentro de él
  (`prj_62aodSYTv6LfKEBGFqR7yyGHSf4E`, producción en `https://relevos-costaleros-nu.vercel.app`).
  El proyecto homónimo que se había creado por error en el equipo viejo se borró. El punto de L4
  sobre Vercel queda obsoleto; el resto de L4 sigue vigente.

### L8 · Decisiones del usuario sobre dos desviaciones de §10 (2026-11-17)

§10 es un contrato cerrado, así que las dos desviaciones las autorizó el usuario de forma
explícita:

1. **Una cuenta, una cuadrilla.** §10 no guarda el email en `costaleros` ni fija un índice único
   sobre `profile_id`: la app lo comprobaba antes de insertar y dos altas simultáneas se colaban.
   Decisión: **índice único parcial** `costaleros_profile_id_unico` sobre `profile_id` donde no es
   nulo, con migración propia (`20250330000400`). Los costaleros sin cuenta (alta del capataz antes
   del registro) siguen sin estar bloqueados. La app traduce el error `23505` al mensaje en español
   en vez de filtrar el error de Postgres.
2. **Los tramos de la línea de tiempo del costalero.** §10 le concede al costalero leer "solo
   planes publicados de cuadrillas a las que pertenece, y de nada más", pero P8 necesita los
   nombres y el orden de los tramos. Decisión: **se mantiene el proxy del servidor con el cliente
   admin** y filtros exactos (`plan_id` + `costalero_id`), sin tocar las políticas de §10. El
   contexto (plan y fila del costalero) sale del cliente del usuario con RLS, y el resultado se
   filtra otra vez en el caller. Queda anotado como riesgo de seguridad para la revisión.

### L9 · W4 entregada (T5)

- Login con contraseña, enlace mágico y alta de cuenta con rol `costalero` por defecto; mensajes
  de error en español; aviso de instalación en iOS. Middleware con refresh de sesión, protección de
  rutas y logout. P2 de cuadrillas con alta, edición, borrado y gestión de costaleros. P8 con la
  línea de tiempo personal del costalero.
- **Verificado por el orquestador**: lint sin errores, typecheck limpio, **132 tests verdes** en 23
  ficheros y build OK con 4 rutas dinámicas (`/cuadrillas`, `/cuadrillas/nueva`,
  `/cuadrillas/[cuadrillaId]`, `/cuadrillas/[cuadrillaId]/mi-relevo`) y `/login`.
- **Corrección del orquestador**: el build fallaba porque `/cuadrillas` se prerenderizaba y el
  cliente de Supabase exige variables en tiempo de build (el CI compila sin ellas). El grupo
  autenticado ahora es `force-dynamic`: las rutas dependen de la sesión y el build no necesita
  variables de Supabase.
- **Pendiente**: la verificación contra la nube (login real, alta de cuenta, logout, CRUD y P8) no
  se puede hacer hasta que el proyecto cloud de Supabase tenga migraciones aplicadas y variables
  cargadas. Las pruebas usan PGlite y dobles.

### L10 · W5 entregada (T6) y corrección de un criterio del briefing

- Wizard de seis pasos (P3): datos del paso, reparto por pool con la marca de F-4, asignación nominal
  con el puesto de §6 visible, las dos boquillas del paso, propuesta de T y checklist F-1..F-6 con
  semáforo. El botón de calcular el plan queda deshabilitado mientras falle cualquier precondición.
  La regla S-7 (un costalero en un solo pool) se valida **en el servidor antes de escribir**: si se
  incumple, no se persiste nada.
- **La propuesta de T sale de `evaluarFactibilidad` (W2)**, no de una fórmula propia:
  `tramosNecesarios` = `ceil(2 · pool / r)` con `r = pool − carga` (§7.3).
- **Corrección de un criterio del briefing**: decía que con pool 6 y carga 5 el paso 5 propone
  `T = 4`. §7.3 y los tests de W2 dan `T = 12`: con `T = 4` la precondición F-2 fallaría
  (`T·r = 4 < 2·pool = 12`). El caso que sí da `T = 4` es pool 10 con carga 5. El criterio estaba
  mal y se corrigió en `docs/briefings/BRIEFINGS.md`; el worker implementó la spec.
- El puesto de cada costalero se **deriva** del orden del pool y no se persiste: §10 no da columna
  de orden en `asignaciones` y P-6 dice que la app no decide quién es el corriente.
- W5 no borra ni reordena tramos (eso es W6): crea los que faltan, renombra los existentes y avisa
  de los que quedan fuera de la propuesta.
- Verificado por el orquestador: lint, typecheck, suite completa y build en verde.

### L11 · El bundle rompía el cliente de Supabase (bug encontrado al desplegar)

- **Síntoma**: en producción, `/cuadrillas` respondía `307 → /login?error=configuracion` y el
  middleware nunca veía una sesión. La causa no era la configuración: `src/server/supabase/loader.ts`
  pedía el módulo con `import(especificacion)`, es decir, con una **variable**. Webpack no puede
  analizar esa llamada y la compila a un contexto vacío (`321: a => { ... throw "Cannot find
module" }`), así que **en el bundle** cualquier carga del cliente de Supabase lanzaba
  "Cannot find module '@supabase/ssr'". En los tests (vitest no empaqueta) el import dinámico
  nativo sí funcionaba, y los tests de W1 usaban un cliente falso: el fallo sólo aparecía al
  empaquetar.
- **Corrección**: el especificador va literal en cada rama (`import("@supabase/ssr")` /
  `import("@supabase/supabase-js")`), que es lo que webpack sabe empaquetar. Se añade un test que
  fija el requisito (además del funcional) para que no vuelva: `src/server/supabase/__tests__/loader.test.ts`.
- **Cómo se detectó**: el despliegue de Vercel devolvía 404 en todas las rutas porque el proyecto
  tenía `framework: None` (Vercel publicaba sólo `public/`). Corregido a `nextjs` por la API
  (`PATCH /v9/projects/<id>` con `teamId`), y entonces ya se vio el `error=configuracion`.
- **Verificado**: build local sin avisos de "Critical dependency"; `/cuadrillas` sin sesión
  responde `307 → /login?returnTo=/cuadrillas` (el middleware llega a Supabase y no hay sesión),
  que es el comportamiento correcto.
- **Entorno**: el proyecto cloud de Supabase es `mrmdonbmmhurlpnicjbn`, región **eu-central-1**,
  pooler `aws-0-eu-central-1.pooler.supabase.com` (modo transacción). Esta máquina no tiene IPv6
  global, así que el host directo `db.<ref>.supabase.co` no sirve.

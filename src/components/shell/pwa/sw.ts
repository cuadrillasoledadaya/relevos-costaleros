/**
 * Service worker de la PWA.
 *
 * Integración con `@serwist/next`:
 * - el plugin de webpack inyecta el manifiesto de precache en `self.__SW_MANIFEST`;
 * - el plugin emite el fichero compilado en `public/sw.js` (`swDest`);
 * - el plugin registra el service worker en el cliente (`sw-entry`).
 *
 * El runtime del service worker está escrito con las APIs estándar del
 * navegador (sin dependencias): precache del shell, runtime caching de los
 * assets estáticos y página de fallback offline (`/offline.html`).
 *
 * Motivo: el paquete `serwist` es una dependencia transitiva de `@serwist/next`
 * y, con el gestor de paquetes `pnpm` en modo aislado, no se puede importar
 * desde el código del proyecto (ver el informe de cierre de la unidad W3: si
 * `serwist` se añade como dependencia directa, este fichero puede cambiarse
 * por la implementación canónica de Serwist sin tocar nada más).
 */

/** Entrada del manifiesto de precache que inyecta `@serwist/next`. */
type EntradaPrecache = {
  url: string;
  revision?: string | null;
};

/** Evento `install`/`activate` del service worker (no está en `lib.dom`). */
type EventoExtendible = Event & {
  waitUntil(promesa: Promise<unknown>): void;
};

/** Evento `fetch` del service worker (no está en `lib.dom`). */
type EventoFetch = Event & {
  readonly request: Request;
  readonly preloadResponse?: Promise<Response>;
  respondWith(respuesta: Response | Promise<Response>): void;
};

/** Subconjunto del `ServiceWorkerGlobalScope` que usa este fichero. */
interface EntornoServiceWorker {
  __SW_MANIFEST: EntradaPrecache[];
  readonly caches: CacheStorage;
  readonly clients: { claim(): Promise<void> };
  readonly location: { origin: string };
  skipWaiting(): void;
  addEventListener(
    type: "install",
    listener: (event: EventoExtendible) => void,
  ): void;
  addEventListener(
    type: "activate",
    listener: (event: EventoExtendible) => void,
  ): void;
  addEventListener(type: "fetch", listener: (event: EventoFetch) => void): void;
}

declare const self: EntornoServiceWorker;

const CACHE_PRECACHE = "relevos-precache-v1";
const CACHE_RUNTIME = "relevos-runtime-v1";
const PAGINA_OFFLINE = "/offline.html";

const PRECACHE = self.__SW_MANIFEST;

function urlAbsoluta(url: string): string {
  return new URL(url, self.location.origin).toString();
}

/** ¿Es un asset estático que conviene cachear? */
function esAssetEstatico(url: URL): boolean {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return /\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js)$/i.test(
    url.pathname,
  );
}

/** Instala el shell: precachea todos los assets del manifiesto. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await self.caches.open(CACHE_PRECACHE);
      await Promise.all(
        PRECACHE.map(async (entrada) => {
          const url = urlAbsoluta(entrada.url);
          try {
            const respuesta = await fetch(url, { cache: "reload" });
            if (respuesta.ok || respuesta.type === "opaque") {
              await cache.put(url, respuesta);
            }
          } catch {
            // Un asset que falla no debe impedir instalar el service worker.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

/** Activa el service worker y limpia el precache obsoleto. */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await self.caches.open(CACHE_PRECACHE);
      const vigentes = new Set(
        PRECACHE.map((entrada) => urlAbsoluta(entrada.url)),
      );
      const claves = await cache.keys();
      await Promise.all(
        claves
          .filter((clave) => !vigentes.has(clave.url))
          .map((clave) => cache.delete(clave)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Responde a las peticiones: navegación con red y assets con caché. */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Las llamadas a la API y las cargas de RSC nunca se cachean.
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.get("RSC") === "1") return;

  if (request.mode === "navigate") {
    event.respondWith(responderNavegacion(event));
    return;
  }

  if (esAssetEstatico(url)) {
    event.respondWith(responderAsset(request));
  }
});

/** Navegaciones: red primero; sin red, la página ya vista o la de fallback. */
async function responderNavegacion(event: EventoFetch): Promise<Response> {
  try {
    const precargada = await event.preloadResponse;
    if (precargada) return precargada;
    return await fetch(event.request);
  } catch {
    const cacheRuntime = await self.caches.open(CACHE_RUNTIME);
    const guardada = await cacheRuntime.match(event.request, {
      ignoreSearch: true,
    });
    if (guardada) return guardada;

    const cachePrecache = await self.caches.open(CACHE_PRECACHE);
    const offline = await cachePrecache.match(PAGINA_OFFLINE);
    if (offline) return offline;

    return new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** Assets estáticos: caché primero y, en segundo plano, se refresca la caché. */
async function responderAsset(request: Request): Promise<Response> {
  const cache = await self.caches.open(CACHE_RUNTIME);
  const guardada = await cache.match(request);
  if (guardada) return guardada;

  const respuesta = await fetch(request);
  if (respuesta.ok && respuesta.type === "basic") {
    await cache.put(request, respuesta.clone());
  }
  return respuesta;
}

export {};

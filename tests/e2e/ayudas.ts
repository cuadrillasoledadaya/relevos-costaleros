/**
 * Ayudas de los E2E (W9).
 *
 * Las credenciales y las claves salen **del entorno**: el repositorio es
 * público y no puede guardar contraseñas. En CI llegan como secretos del
 * repositorio; en local, de las variables de `.env.local`.
 */

import { expect, type Page } from "@playwright/test";

/** Datos de demostración que deja la semilla (§10). */
export const DEMO = {
  cuadrillaId: "b0000000-0000-4000-8000-000000000001",
  cuadrillaNombre: "Cuadrilla de demostración",
  pasoId: "d0000000-0000-4000-8000-000000000001",
  pasoNombre: "Paso de demostración",
  /** Puestos de §6 de la primera y de la última trabajadera. */
  puestosPrimera: "patero izquierdo",
  puestosUltima: "patero derecho",
} as const;

/** Una cuenta de las pruebas. */
export type Cuenta = { correo: string; clave: string };

/**
 * La cuenta de pruebas indicada (`capataz` o `costalero`).
 *
 * Si no vienen las variables de entorno, la prueba falla con un mensaje
 * claro: es mejor que hacer la prueba contra la cuenta equivocada.
 */
export function cuentaDe(rol: "capataz" | "costalero"): Cuenta {
  const prefijo = `E2E_${rol.toUpperCase()}`;
  const correo = process.env[`${prefijo}_EMAIL`];
  const clave = process.env[`${prefijo}_PASSWORD`];
  if (!correo || !clave) {
    throw new Error(
      `Faltan ${prefijo}_EMAIL y ${prefijo}_PASSWORD para las pruebas de ${rol}.`,
    );
  }
  return { correo, clave };
}

/**
 * Entra en la app con la cuenta dada y espera a las cuadrillas.
 *
 * El login tiene dos formularios (entrar y crear cuenta), así que los campos
 * se localizan por su id y no por su etiqueta.
 */
export async function entrar(page: Page, cuenta: Cuenta): Promise<void> {
  await page.goto("/login");
  await page.locator("#correo").fill(cuenta.correo);
  await page.locator("#password").fill(cuenta.clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/cuadrillas/);
  await expect(page.getByRole("heading", { name: /Cuadrillas/ })).toBeVisible();
}

/** Entra como capataz. */
export async function entrarComoCapataz(page: Page): Promise<void> {
  await entrar(page, cuentaDe("capataz"));
}

/** Entra como costalero. */
export async function entrarComoCostalero(page: Page): Promise<void> {
  await entrar(page, cuentaDe("costalero"));
}

/** Va al paso de demostración desde las cuadrillas. */
export async function abrirPasoDeDemostracion(page: Page): Promise<void> {
  await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/plan`);
  await expect(
    page.getByRole("heading", { name: /Plan de relevos/ }),
  ).toBeVisible();
}

/**
 * Los avisos de la pantalla.
 *
 * Se acotan al `main` porque Next.js añade un `role="alert"` vacío (el
 * anunciador de rutas) que haría fallar el modo estricto de Playwright. Se
 * cogen los dos roles del design system: `alert` para los errores y `status`
 * para los avisos.
 */
export function aviso(page: Page) {
  return page
    .locator("main form [role='alert'], main form [role='status']")
    .first();
}

/**
 * La tarjeta (la `Card` del design system) que contiene el texto dado.
 *
 * Sirve para el botón o el enlace de una tarjeta concreta cuando hay
 * varias en la página (por ejemplo, las cuadrillas del listado).
 */
export function tarjetaCon(page: Page, texto: string | RegExp) {
  return page.locator("div.shadow-xs").filter({ hasText: texto });
}

/** Un nombre único por prueba, para no chocar con otros datos. */
export function nombreUnico(prefijo: string): string {
  return `${prefijo} E2E ${Date.now().toString(36)}`;
}

/**
 * La versión más alta que tienen los planes del paso.
 *
 * Sirve para borrar después los planes que crean las pruebas.
 */
export async function versionMaximaDePlanes(pasoId: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) return 0;
  const respuesta = await fetch(
    `${url}/rest/v1/planes?paso_id=eq.${pasoId}&select=version&order=version.desc&limit=1`,
    { headers: { apikey: clave, Authorization: `Bearer ${clave}` } },
  );
  const filas = (await respuesta.json()) as Array<{ version: number }>;
  return filas[0]?.version ?? 0;
}

/**
 * Borra los planes que han creado las pruebas.
 *
 * La app no tiene un «borrar plan» (el historial se conserva), así que la
 * limpieza se hace con la clave de servicio, que es la de las pruebas.
 */
export async function borrarPlanesDePrueba(
  pasoId: string,
  versionMinima: number,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) return;
  await fetch(
    `${url}/rest/v1/planes?paso_id=eq.${pasoId}&version=gt.${versionMinima - 1}`,
    {
      method: "DELETE",
      headers: { apikey: clave, Authorization: `Bearer ${clave}` },
    },
  );
}

/**
 * Espera a que el service worker esté activo y controlando la página.
 *
 * Sin esto, la prueba de offline puede correr antes de que el service
 * worker haya tomado el control y fallaría sin motivo.
 */
export async function esperarServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 30_000 },
  );
}

/**
 * E2E de accesibilidad básica (W9).
 *
 * Chequeo automático con axe-core en las pantallas principales: login,
 * wizard del paso, plan y hoja. Los errores «serious» y «critical» rompen la
 * prueba; los «minor» quedan documentados en `docs/a11y.md`.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { DEMO, entrarComoCapataz } from "./ayudas";

/** Los errores que bloquean: «serious» y «critical». */
const BLOQUEANTES = ["serious", "critical"];

/**
 * Analiza la página y devuelve los errores que bloquean.
 */
async function erroresBloqueantes(page: import("@playwright/test").Page) {
  const resultados = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return resultados.violations.filter((violacion) =>
    BLOQUEANTES.includes(violacion.impact ?? ""),
  );
}

test.describe("accesibilidad", () => {
  test("la pantalla de login no tiene errores graves", async ({ page }) => {
    await page.goto("/login");

    const errores = await erroresBloqueantes(page);

    expect(errores.map((error) => `${error.id}: ${error.help}`)).toEqual([]);
  });

  test("el wizard del paso no tiene errores graves", async ({ page }) => {
    await entrarComoCapataz(page);
    await page.goto(
      `/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/configuracion`,
    );
    await expect(
      page.getByRole("navigation", { name: "Navegación del wizard" }),
    ).toBeVisible();

    const errores = await erroresBloqueantes(page);

    expect(errores.map((error) => `${error.id}: ${error.help}`)).toEqual([]);
  });

  test("la pantalla del plan no tiene errores graves", async ({ page }) => {
    await entrarComoCapataz(page);
    await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/plan`);
    await expect(
      page.getByRole("heading", { name: /Plan de relevos/ }),
    ).toBeVisible();

    const errores = await erroresBloqueantes(page);

    expect(errores.map((error) => `${error.id}: ${error.help}`)).toEqual([]);
  });

  test("la hoja no tiene errores graves", async ({ page }) => {
    await entrarComoCapataz(page);
    await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/hoja`);

    const errores = await erroresBloqueantes(page);

    expect(errores.map((error) => `${error.id}: ${error.help}`)).toEqual([]);
  });
});

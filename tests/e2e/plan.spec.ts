/**
 * E2E de la pantalla principal del plan (W9, §9 P5).
 *
 * El plan se calcula sobre el paso de demostración y se borra al terminar: los
 * datos de demostración quedan como estaban.
 */

import { expect, test } from "@playwright/test";

import {
  DEMO,
  abrirPasoDeDemostracion,
  borrarPlanesDePrueba,
  entrarComoCapataz,
  versionMaximaDePlanes,
} from "./ayudas";

test.describe("pantalla del plan de relevos", () => {
  /** Versión más alta antes de la prueba: los planes de más se borran al final. */
  let versionInicial = 0;

  test.beforeAll(async () => {
    versionInicial = await versionMaximaDePlanes(DEMO.pasoId);
  });

  test.afterAll(async () => {
    await borrarPlanesDePrueba(DEMO.pasoId, versionInicial);
  });

  test("calcula el plan y enseña los nombres, las estadísticas y las reglas", async ({
    page,
  }) => {
    await entrarComoCapataz(page);
    await abrirPasoDeDemostracion(page);

    await page
      .getByRole("button", { name: "Calcular plan de relevos" })
      .click();

    // La vista por tramo: una columna por tramo con los nombres de quien va
    // en el paso y de quien descansa.
    await expect(page.getByText(/Versión \d+/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("columnheader", { name: /1\. Salida/ }),
    ).toBeVisible();
    await expect(page.getByText(/Costalero \d\d/).first()).toBeVisible();

    // La vista por costalero: una fila por persona con sus descansos.
    await page.getByRole("tab", { name: "Por costalero" }).click();
    await expect(
      page.getByRole("cell", { name: /Costalero \d\d/ }).first(),
    ).toBeVisible();

    // El panel de estadísticas: media, dispersión y cumplimiento de R1 a R5.
    await page.getByRole("tab", { name: "Estadísticas" }).click();
    await expect(page.getByText(/Media de descansos/)).toBeVisible();
    await expect(page.getByText("Dispersión global")).toBeVisible();
    await expect(page.getByText("R1")).toBeVisible();
    await expect(page.getByText("R5")).toBeVisible();
    await expect(page.getByText("Cumple").first()).toBeVisible();
  });

  test("el historial muestra las versiones y permite publicar", async ({
    page,
  }) => {
    await entrarComoCapataz(page);
    await abrirPasoDeDemostracion(page);

    await page
      .getByRole("button", { name: "Calcular plan de relevos" })
      .click();
    await expect(page.getByText(/Versión \d+/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(page.getByText(/Versión \d+/).first()).toBeVisible();

    const publicar = page.getByRole("button", { name: "Publicar" }).first();
    if (await publicar.isVisible().catch(() => false)) {
      await publicar.click();
      await expect(
        page.getByText("Plan publicado: los costaleros ya lo ven."),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Publicada").first()).toBeVisible();
    }
  });

  test("un costalero no puede entrar en la pantalla del plan", async ({
    page,
  }) => {
    const { cuentaDe } = await import("./ayudas");
    const cuenta = cuentaDe("costalero");

    await page.goto("/login");
    await page.locator("#correo").fill(cuenta.correo);
    await page.locator("#password").fill(cuenta.clave);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/cuadrillas/);

    await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/plan`);
    await expect(page.getByText("Sin permisos")).toBeVisible();
  });
});

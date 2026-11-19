/**
 * E2E del wizard del paso (W9, §9 P3).
 *
 * Las pruebas miran el paso de demostración **sin guardar** (los cambios que
 * se hacen en la carga son sólo del formulario), así que los datos de
 * demostración no se tocan.
 */

import { expect, test } from "@playwright/test";

import { DEMO, entrarComoCapataz } from "./ayudas";

/** Abre el wizard del paso de demostración. */
async function abrirWizard(page: import("@playwright/test").Page) {
  await entrarComoCapataz(page);
  await page.goto(
    `/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/configuracion`,
  );
  await expect(
    page.getByRole("navigation", { name: "Navegación del wizard" }),
  ).toBeVisible();
}

/** Va al paso del wizard que se le pase (0 es el primero). */
async function irAPaso(page: import("@playwright/test").Page, indice: number) {
  for (let paso = 0; paso < indice; paso += 1) {
    await page.getByRole("button", { name: "Siguiente" }).click();
  }
}

test.describe("wizard del paso", () => {
  test("enseña los seis pasos del wizard", async ({ page }) => {
    await abrirWizard(page);

    const pasos = page.getByRole("navigation", {
      name: "Pasos de la configuración del paso",
    });
    await expect(pasos).toContainText("Datos del paso");
    await expect(pasos).toContainText("Costaleros del paso");
    await expect(pasos).toContainText("Asignación nominal");
    await expect(pasos).toContainText("Boquillas");
    await expect(pasos).toContainText("Tramos");
    await expect(pasos).toContainText("Resumen y validación");
  });

  test("la asignación nominal enseña los puestos de §6", async ({ page }) => {
    await abrirWizard(page);
    await irAPaso(page, 2);

    // La primera trabajadera lleva pateros y las del medio costeros (§6).
    await expect(page.getByText(/Trabajadera 1 · primera/)).toBeVisible();
    await expect(page.getByText(/Trabajadera 2 · intermedia/)).toBeVisible();
    await expect(page.getByText("patero izquierdo").first()).toBeVisible();
    await expect(page.getByText("costero izquierdo").first()).toBeVisible();
    await expect(page.getByText("corriente").first()).toBeVisible();
  });

  test("el reparto avisa cuando a una trabajadera le falta un suplente", async ({
    page,
  }) => {
    await abrirWizard(page);
    await irAPaso(page, 1);

    // El pool de la primera working line tiene 4 costaleros: con carga 5
    // faltan suplentes (F-4) y el resumen bloquea el plan.
    const carga = page.getByLabel(
      "Carga (costaleros dentro del paso a la vez)",
    );
    await carga.first().fill("5");

    await expect(page.getByText("F-4 · falta un suplente")).toBeVisible();

    await irAPaso(page, 4);
    await expect(
      page.getByText("El plan todavía no se puede calcular"),
    ).toBeVisible();

    // No se guarda nada: los datos de demostración siguen intactos.
  });

  test("el resumen dice que el paso es factible", async ({ page }) => {
    await abrirWizard(page);
    await irAPaso(page, 5);

    await expect(page.getByText("El paso es factible")).toBeVisible();
  });
});

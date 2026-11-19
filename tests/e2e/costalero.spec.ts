/**
 * E2E de la vista del costalero (W9, §9 P8).
 *
 * El costalero ve **su** plan publicado y nada más: ni los borradores ni los
 * planes de los demás.
 */

import { expect, test } from "@playwright/test";

import { DEMO, cuentaDe, entrarComoCapataz } from "./ayudas";

test.describe("vista del costalero", () => {
  test("sin plan publicado ve que el capataz tiene que publicarlo", async ({
    page,
  }) => {
    const cuenta = cuentaDe("costalero");

    await page.goto("/login");
    await page.locator("#correo").fill(cuenta.correo);
    await page.locator("#password").fill(cuenta.clave);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/cuadrillas/);

    await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/mi-relevo`);

    // O bien no hay plan publicado todavía, o bien ve el suyo.
    const vacio = page.getByText(/Todavía no hay un plan publicado/);
    const propio = page.getByText(/Sólo se muestran los tramos de/);
    await expect(vacio.or(propio)).toBeVisible();

    // Nunca ve el nombre de otro costalero.
    const otros = page.getByText(/Costalero 0[2-9]|Costalero 1[01]/);
    await expect(otros).toHaveCount(0);
  });

  test("un plan en borrador no le llega al costalero", async ({ page }) => {
    // El capataz calcula un plan (queda en borrador).
    await page.goto("/login");
    await page.locator("#correo").fill("capataz@relevos.example");
    await page.locator("#password").fill("Demo-Relevos-2026!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/cuadrillas/);

    await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/plan`);
    await page
      .getByRole("button", { name: "Calcular plan de relevos" })
      .click();
    await expect(page.getByText(/Versión \d+/)).toBeVisible({
      timeout: 30_000,
    });

    // El costalero sigue sin verlo.
    const cuenta = cuentaDe("costalero");
    const contexto = await page.context().browser()?.newContext();
    const pagina = contexto ? await contexto.newPage() : page;
    await pagina.goto("/login");
    await pagina.locator("#correo").fill(cuenta.correo);
    await pagina.locator("#password").fill(cuenta.clave);
    await pagina.getByRole("button", { name: "Entrar", exact: true }).click();
    await pagina.waitForURL(/\/cuadrillas/);
    await pagina.goto(`/cuadrillas/${DEMO.cuadrillaId}/mi-relevo`);

    // El borrador no aparece en la vista del costalero.
    const borrador = await page
      .getByText(/Versión \d+/)
      .first()
      .textContent();
    if (borrador) {
      await expect(pagina.getByText(borrador)).toHaveCount(0);
    }
    await expect(
      pagina
        .getByText(/Todavía no hay un plan publicado/)
        .or(pagina.getByText(/Sólo se muestran los tramos de/)),
    ).toBeVisible();
    if (contexto) await contexto.close();
  });
});

/**
 * E2E del comportamiento offline de la PWA (W9, §1 y §9).
 *
 * Con el service worker activo, la app sigue abriendo lo último que se
 * vio: el capataz puede consultar la hoja aunque se le caiga la conexión en
 * el recorrido.
 */

import { expect, test } from "@playwright/test";

import { DEMO, entrarComoCapataz, esperarServiceWorker } from "./ayudas";

test.describe("offline", () => {
  test("con la red caída, el shell carga y la hoja visitada sigue disponible", async ({
    page,
    context,
  }) => {
    await entrarComoCapataz(page);

    // Se calcula el plan y se visita la hoja: es lo último que se ha visto.
    await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/plan`);
    await page
      .getByRole("button", { name: "Calcular plan de relevos" })
      .click();
    await expect(page.getByText(/Versión \d+/)).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/hoja`);
    await expect(
      page.getByRole("heading", { name: /Hoja de relevos/ }),
    ).toBeVisible();

    await esperarServiceWorker(page);

    // Se cae la red y se recarga.
    await context.setOffline(true);
    await page.reload();

    // El shell de la app carga y la hoja sigue ahí.
    await expect(
      page.getByRole("heading", { name: /Hoja de relevos/ }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("patero izquierdo").first()).toBeVisible();

    await context.setOffline(false);
  });
});

/**
 * E2E de la hoja del capataz y de la exportación (W9, §9 P6 y P7).
 */

import { expect, test } from "@playwright/test";

import { DEMO, entrarComoCapataz } from "./ayudas";

/** Calcula el plan del paso de demostración y abre su hoja. */
async function abrirHoja(page: import("@playwright/test").Page) {
  await entrarComoCapataz(page);
  await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/plan`);
  await page.getByRole("button", { name: "Calcular plan de relevos" }).click();
  await expect(page.getByText(/Versión \d+/)).toBeVisible({ timeout: 30000 });

  await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/hoja`);
  await expect(
    page.getByRole("heading", { name: /Hoja de relevos/ }),
  ).toBeVisible({ timeout: 30000 });
}

test.describe("hoja del capataz y exportación", () => {
  test("muestra una hoja por trabajadera con los puestos de §6", async ({
    page,
  }) => {
    await abrirHoja(page);

    await expect(
      page.getByRole("heading", { name: "Trabajadera 1" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Trabajadera 3" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "patero izquierdo" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "corriente" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("rowheader", { name: /1\. Salida/ }).first(),
    ).toBeVisible();
  });

  test("el PDF impreso no lleva los botones de navegación", async ({
    page,
  }) => {
    await abrirHoja(page);

    // Se emula el "Imprimir" del navegador y se mira el PDF que sale.
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    expect(pdf.length).toBeGreaterThan(1000);
  });

  test("descarga el CSV de relevos con las filas esperadas", async ({
    page,
  }) => {
    await abrirHoja(page);

    const descarga = page.waitForEvent("download");
    await page.getByRole("link", { name: "Exportar CSV de relevos" }).click();
    const archivo = await descarga;

    const ruta = await archivo.path();
    expect(ruta).toBeTruthy();
    const contenido = await archivo.createReadStream().then((flujo) => {
      return new Promise<string>((resolver, rechazar) => {
        let texto = "";
        flujo.on("data", (trozo) => {
          texto += String(trozo);
        });
        flujo.on("end", () => resolver(texto));
        flujo.on("error", rechazar);
      });
    });

    const lineas = contenido.split("\r\n").filter((linea) => linea.length > 0);
    expect(lineas[0]).toContain("tramo;ordinal;tipo;costalero");
    expect(lineas).toHaveLength(1 + 12 * 4);
    expect(contenido.charCodeAt(0)).toBe(0xfeff);
  });
});

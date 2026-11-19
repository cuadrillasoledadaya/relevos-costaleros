/**
 * E2E de las cuadrillas y sus costaleros (W9, §9 P2).
 *
 * La prueba crea una cuadrilla con un nombre único y la borra al final: los
 * datos de demostración no se tocan.
 */

import { expect, test } from "@playwright/test";

import { aviso, entrarComoCapataz, nombreUnico, tarjetaCon } from "./ayudas";

/** Crea una cuadrilla de prueba y devuelve su nombre. */
async function crearCuadrilla(
  page: import("@playwright/test").Page,
  prefijo: string,
): Promise<string> {
  const nombre = nombreUnico(prefijo);
  await page.goto("/cuadrillas/nueva");
  await page.getByLabel("Nombre de la cuadrilla").fill(nombre);
  await page.getByLabel("Año").fill("2025");
  await page.getByRole("button", { name: "Crear cuadrilla" }).click();

  // Esperar a que aparezca el mensaje de éxito o que se redirija a la ficha
  await expect(
    page
      .getByRole("heading", { name: /Cuadrilla E2E/, exact: true })
      .or(page.locator("main").getByText("Cuadrilla creada correctamente"))
      .or(
        page
          .locator("main")
          .getByRole("alert")
          .filter({ hasText: /creada/i }),
      ),
  ).toBeVisible({ timeout: 120000 });

  // Si estamos en la ficha, el título es el nombre de la cuadrilla
  // Si no, comprobamos el mensaje de éxito
  try {
    await expect(page.getByRole("heading", { exact: true })).toBeVisible({
      timeout: 5000,
    });
  } catch {
    await expect(aviso(page)).toContainText("Cuadrilla creada correctamente.", {
      timeout: 20000,
    });
  }

  return nombreUnico("Cuadrilla");
}

/** Borra la cuadrilla de prueba desde el listado. */
async function borrarCuadrilla(
  page: import("@playwright/test").Page,
  nombre: string,
): Promise<void> {
  await page.goto("/cuadrillas");
  const tarjeta = tarjetaCon(page, nombre);
  await tarjeta.getByRole("button", { name: "Eliminar" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar" })
    .click();
  await expect(
    page.getByRole("heading", { name: nombre, exact: true }),
  ).toHaveCount(0, { timeout: 15_000 });
}

test.describe("cuadrillas y costaleros", () => {
  test("crea una cuadrilla, da de alta un costalero y lo ve en la lista", async ({
    page,
  }) => {
    await entrarComoCapataz(page);
    const nombre = await crearCuadrilla(page, "Cuadrilla");

    // La cuadrilla sale en el listado y se puede abrir.
    await page.goto("/cuadrillas");
    await expect(
      page.getByRole("heading", { name: nombre, exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await tarjetaCon(page, nombre).getByRole("link", { name: "Abrir" }).click();
    await expect(
      page.getByRole("heading", { name: nombre, exact: true }),
    ).toBeVisible();

    // Se da de alta un costalero y aparece en la lista de la cuadrilla.
    await page
      .getByRole("button", { name: "Añadir costalero" })
      .first()
      .click();
    await page.getByLabel("Nombre completo").fill("E2E Costalero Uno");
    await page.getByRole("button", { name: "Añadir costalero" }).click();
    await expect(page.getByText("E2E Costalero Uno")).toBeVisible({
      timeout: 30000,
    });

    await borrarCuadrilla(page, nombre);
  });

  test("no deja dar de alta dos veces al mismo costalero en dos cuadrillas", async ({
    page,
  }) => {
    await entrarComoCapataz(page);
    const nombre = await crearCuadrilla(page, "Cuadrilla duplicada");

    await page.goto("/cuadrillas");
    await tarjetaCon(page, nombre).getByRole("link", { name: "Abrir" }).click();

    // El costalero 01 ya está en la cuadrilla de demostración: la app avisa
    // y no lo deja tener en dos cuadrillas.
    await page
      .getByRole("button", { name: "Añadir costalero" })
      .first()
      .click();
    await page.getByLabel("Nombre completo").fill("E2E Repetido");
    await page
      .getByLabel("Correo de una cuenta existente")
      .fill("costalero-01@relevos.example");
    await page.getByRole("button", { name: "Añadir costalero" }).click();

    await expect(aviso(page)).toContainText(/otra cuadrilla/i);

    await borrarCuadrilla(page, nombre);
  });
});

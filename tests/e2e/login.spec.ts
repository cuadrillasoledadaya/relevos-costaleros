/**
 * E2E del acceso (W9, §9 P1).
 */

import { expect, test } from "@playwright/test";

import { aviso, cuentaDe } from "./ayudas";

test.describe("acceso a la app", () => {
  test("entra con correo y contraseña y llega a las cuadrillas", async ({
    page,
  }) => {
    const cuenta = cuentaDe("capataz");

    await page.goto("/login");
    await page.locator("#correo").fill(cuenta.correo);
    await page.locator("#password").fill(cuenta.clave);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await page.waitForURL(/\/cuadrillas/);
    await expect(
      page.getByRole("heading", { name: /Cuadrillas/ }),
    ).toBeVisible();
  });

  test("con credenciales incorrectas avisa en español y no entra", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#correo").fill("capataz@relevos.example");
    await page.locator("#password").fill("contraseña-equivocada");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    const mensaje = aviso(page);
    await expect(mensaje).toBeVisible();
    await expect(mensaje).toContainText(
      /contraseña|credenciales|inválid|válid/i,
    );
    await expect(page).toHaveURL(/\/login/);
  });

  test("el enlace mágico pide el envío sin salir del login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#correo").fill("capataz@relevos.example");
    await page.getByRole("button", { name: "Enviar enlace mágico" }).click();

    // El aviso sale en español: o bien que el enlace está en camino, o bien
    // que el correo no se ha podido enviar (la instancia de pruebas no
    // tiene servidor de correo).
    await expect(aviso(page)).toContainText(/enlace|correo|sesión|inténtalo/i);
    await expect(page).toHaveURL(/\/login/);
  });
});

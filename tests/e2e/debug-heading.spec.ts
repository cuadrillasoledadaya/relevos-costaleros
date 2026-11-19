import { expect, test } from "@playwright/test";
import { DEMO, entrarComoCapataz } from "./ayudas";

test("debug heading issue", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#correo").fill("capataz@relevos.example");
  await page.locator("#password").fill("Demo-Relevos-2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/cuadrillas/, { timeout: 60000 });

  // Primero calcular el plan
  await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/plan`);
  await page.getByRole("button", { name: "Calcular plan de relevos" }).click();
  await expect(page.getByText(/Versión \d+/)).toBeVisible({ timeout: 30000 });

  // Ahora ir a la hoja
  await page.goto(`/cuadrillas/${DEMO.cuadrillaId}/paso/${DEMO.pasoId}/hoja`);
  await expect(
    page.getByRole("heading", { name: /Hoja de relevos/ }),
  ).toBeVisible({ timeout: 30000 });

  // Debug all h2s
  const headings = await page.$$eval("h2", (els) =>
    els.map((e) => ({
      text: e.textContent,
      outerHTML: e.outerHTML.slice(0, 200),
    })),
  );
  console.log("All h2s:", JSON.stringify(headings, null, 2));

  // Try different locator strategies
  const byRoleExact = await page
    .getByRole("heading", { name: "Trabajadera 1" })
    .count();
  console.log("getByRole exact:", byRoleExact);

  const byRegex = await page
    .getByRole("heading", { name: /Trabajadera 1/ })
    .count();
  console.log("getByRole regex:", byRegex);

  const byText = await page.getByText("Trabajadera 1").count();
  console.log("getByText:", byText);

  const allH2s = await page.$$eval("h2", (els) =>
    els.map((e) => ({
      text: e.textContent,
      outerHTML: e.outerHTML.slice(0, 200),
    })),
  );
  console.log("All h2s:", JSON.stringify(allH2s, null, 2));
});

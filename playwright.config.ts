import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración de los E2E (W9, §15).
 *
 * Dos viewports: el **móvil** (390×844), que es el uso principal del
 * producto, y el **escritorio** (1280×800). El servidor de pruebas es la app
 * compilada (`pnpm start`), que es como se usa de verdad; en CI se compila
 * antes de correr.
 *
 * Los datos de las pruebas salen del entorno (`E2E_*`): ni las credenciales
 * ni las claves viven en el repositorio, que es público.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Las pruebas tocan la misma base de datos: no van en paralelo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },
  projects: [
    {
      name: "movil",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "escritorio",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  },
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RUTA_LOADER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../loader.ts",
);

describe("carga del cliente de Supabase", () => {
  it("carga el módulo de @supabase/ssr", async () => {
    const { cargarModuloSupabase } = await import("../loader");

    const modulo = (await cargarModuloSupabase("@supabase/ssr")) as {
      createServerClient?: unknown;
    };

    expect(typeof modulo.createServerClient).toBe("function");
  });

  it("usa especificadores literales para que webpack pueda empaquetarlos", async () => {
    // Cuando el módulo se pide con una variable, webpack genera un contexto
    // vacío y falla en runtime con "Cannot find module". En vitest el import
    // dinámico nativo funciona, así que el fallo sólo se ve en el bundle:
    // este test lo fija en el código.
    const fuente = await readFile(RUTA_LOADER, "utf8");

    expect(fuente).not.toMatch(/import\(\s*[a-zA-Z_$][\w$]*\s*\)/);
    expect(fuente).toContain('import("@supabase/ssr")');
    expect(fuente).toContain('import("@supabase/supabase-js")');
  });
});

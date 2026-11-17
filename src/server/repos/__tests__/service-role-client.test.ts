import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DIRECTORIO_ACTUAL = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_REPOSITORIO = path.resolve(DIRECTORIO_ACTUAL, "../../../..");
const RUTAS_CLIENTE = ["src/app", "src/components"];

describe("secretos de servidor", () => {
  it("no contiene SUPABASE_SERVICE_ROLE_KEY en código de cliente", async () => {
    const archivos = await archivosJavaScript(RUTAS_CLIENTE);
    const infractores: string[] = [];

    for (const archivo of archivos) {
      const contenido = await readFile(archivo, "utf8");
      if (contenido.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        infractores.push(path.relative(RAIZ_REPOSITORIO, archivo));
      }
    }

    expect(infractores).toEqual([]);
  });
});

async function archivosJavaScript(rutas: string[]): Promise<string[]> {
  const encontrados: string[] = [];

  async function visitar(ruta: string): Promise<void> {
    let entradas;
    try {
      entradas = await readdir(ruta, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }

    for (const entrada of entradas) {
      const completa = path.join(ruta, entrada.name);
      if (entrada.isDirectory()) {
        await visitar(completa);
      } else if (/\.[cm]?[jt]sx?$/.test(entrada.name)) {
        encontrados.push(completa);
      }
    }
  }

  for (const ruta of rutas) {
    await visitar(path.join(RAIZ_REPOSITORIO, ruta));
  }
  return encontrados;
}

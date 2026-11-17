import { describe, expect, it } from "vitest";

/**
 * X-5 — `src/domain/**` es TypeScript puro: no importa React, Next.js, Supabase ni
 * módulos nativos de Node (además de red, fs y `Math.random()`).
 *
 * El test recorre los ficheros del dominio leyendo su contenido como texto (con
 * `import.meta.glob` de Vite, sin `fs` ni ningún import de Node) y comprueba que ninguna
 * sentencia de import apunta a un módulo prohibido.
 */

const FICHEROS: Record<string, string> = import.meta.glob("../**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as unknown as Record<string, string>;

/** Prefijos y módulos prohibidos dentro de `src/domain/**`. */
const IMPORTACIONES_PROHIBIDAS: string[] = [
  "react",
  "react-dom",
  "next",
  "@supabase/",
  "node:",
  "fs",
  "path",
  "crypto",
  "os",
  "child_process",
  "worker_threads",
  "http",
  "https",
  "net",
];

/**
 * Este mismo fichero contiene los nombres prohibidos (para poder buscarlos), así que
 * se excluye del recorrido.
 */
function esEsteFichero(ruta: string): boolean {
  return ruta.includes("dominio-puro.test.ts");
}

/** Quita los comentarios del código para no buscar dentro de ellos. */
function sinComentarios(codigo: string): string {
  const lineas: string[] = [];
  let enBloque = false;

  for (const linea of codigo.split("\n")) {
    let limpia = linea;
    if (enBloque) {
      const fin = limpia.indexOf("*/");
      if (fin === -1) continue;
      limpia = "";
      enBloque = false;
    }
    const inicioBloque = limpia.indexOf("/*");
    if (inicioBloque !== -1) {
      const fin = limpia.indexOf("*/", inicioBloque + 2);
      if (fin === -1) {
        enBloque = true;
        limpia = limpia.slice(0, inicioBloque);
      } else {
        limpia = limpia.slice(0, inicioBloque) + limpia.slice(fin + 2);
      }
    }
    const inicioLinea = limpia.indexOf("//");
    if (inicioLinea !== -1) limpia = limpia.slice(0, inicioLinea);
    lineas.push(limpia);
  }

  return lineas.join("\n");
}

/** `true` si el especificador de un import está prohibido. */
function esProhibido(especificador: string): boolean {
  return IMPORTACIONES_PROHIBIDAS.some(
    (prohibido) =>
      especificador === prohibido ||
      especificador.startsWith(
        prohibido.endsWith("/") ? prohibido : `${prohibido}/`,
      ),
  );
}

/** Extrae los especificadores importados de una línea de código. */
function especificadoresDe(linea: string): string[] {
  const encontrados: string[] = [];
  const desde = /^\s*(?:import|export)\b[^'"]*?\bfrom\s*["']([^"']+)["']/g;
  const importDirecto = /^\s*import\s*["']([^"']+)["']/g;
  const require = /\brequire\(\s*["']([^"']+)["']\s*\)/g;
  for (const patron of [desde, importDirecto, require]) {
    let coincidencia = patron.exec(linea);
    while (coincidencia) {
      const especificador = coincidencia[1];
      if (especificador !== undefined) encontrados.push(especificador);
      coincidencia = patron.exec(linea);
    }
  }
  return encontrados;
}

describe("X-5 — src/domain/** es TypeScript puro", () => {
  it("recorre todos los ficheros del dominio", () => {
    const rutas = Object.keys(FICHEROS);
    expect(rutas.length).toBeGreaterThan(5);
    expect(rutas.some((ruta) => ruta.includes("solver"))).toBe(true);
  });

  it("ningún fichero importa react, next, @supabase/* ni módulos nativos de node", () => {
    const infracciones: string[] = [];

    for (const ruta of Object.keys(FICHEROS).sort()) {
      if (esEsteFichero(ruta)) continue;
      const codigo = sinComentarios(FICHEROS[ruta] ?? "");
      for (const linea of codigo.split("\n")) {
        for (const especificador of especificadoresDe(linea)) {
          if (esProhibido(especificador)) {
            infracciones.push(`${ruta}: ${especificador}`);
          }
        }
      }
    }

    expect(infracciones).toEqual([]);
  });

  it("ningún fichero del dominio usa Math.random() ni Date.now()", () => {
    const infracciones: string[] = [];

    for (const ruta of Object.keys(FICHEROS).sort()) {
      if (esEsteFichero(ruta)) continue;
      const codigo = sinComentarios(FICHEROS[ruta] ?? "");
      for (const linea of codigo.split("\n")) {
        if (/Math\.random\s*\(/.test(linea) || /Date\.now\s*\(/.test(linea)) {
          infracciones.push(`${ruta}: ${linea.trim()}`);
        }
      }
    }

    expect(infracciones).toEqual([]);
  });
});

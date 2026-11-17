import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const RUTA_GLOBALS = join(RAIZ, "src/app/globals.css");

/** Devuelve el texto interior del bloque `{...}` que empieza en `desde`. */
function extraerBloque(css: string, desde: number): string {
  const inicio = css.indexOf("{", desde);
  if (inicio === -1) throw new Error("No se encontró el inicio del bloque");
  let nivel = 0;
  for (let i = inicio; i < css.length; i += 1) {
    if (css[i] === "{") nivel += 1;
    else if (css[i] === "}") {
      nivel -= 1;
      if (nivel === 0) return css.slice(inicio + 1, i);
    }
  }
  throw new Error("Bloque sin cerrar");
}

/** Lee los tokens `--nombre: valor;` de un bloque CSS. */
function extraerTokens(bloque: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const patron = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match = patron.exec(bloque);
  while (match !== null) {
    const nombre = match[1];
    const valor = match[2];
    if (nombre !== undefined && valor !== undefined) {
      tokens[nombre] = valor.trim();
    }
    match = patron.exec(bloque);
  }
  return tokens;
}

function cargarEsquemas(): {
  claro: Record<string, string>;
  oscuro: Record<string, string>;
} {
  const css = readFileSync(RUTA_GLOBALS, "utf8");
  const raizClaro = css.indexOf(":root");
  if (raizClaro === -1)
    throw new Error("globals.css no define el bloque :root claro");
  const claro = extraerTokens(extraerBloque(css, raizClaro));

  const indiceOscuro = css.indexOf("@media (prefers-color-scheme: dark)");
  if (indiceOscuro === -1) {
    throw new Error("globals.css no define el esquema oscuro");
  }
  const bloqueOscuro = extraerBloque(css, indiceOscuro);
  const raizOscuro = bloqueOscuro.indexOf(":root");
  const oscuro = extraerTokens(extraerBloque(bloqueOscuro, raizOscuro));

  return { claro, oscuro };
}

function canal(canalHex: string): number {
  const valor = canalHex.replace("#", "");
  const completo =
    valor.length === 3
      ? valor
          .split("")
          .map((c) => c + c)
          .join("")
      : valor;
  return parseInt(completo, 16) / 255;
}

function luminancia(color: string): number {
  const hex = color.replace("#", "");
  const r = canal(hex.slice(0, 2));
  const g = canal(hex.slice(2, 4));
  const b = canal(hex.slice(4, 6));
  const lineal = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Ratio de contraste WCAG 2.1 entre dos colores hexadecimales. */
function contraste(primerColor: string, segundoColor: string): number {
  const l1 = luminancia(primerColor);
  const l2 = luminancia(segundoColor);
  const [alto, bajo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (alto + 0.05) / (bajo + 0.05);
}

/**
 * Pares de tokens que deben cumplir contraste WCAG AA.
 * `minimo` 4.5 para texto normal, 3 para texto grande y bordes de control (1.4.11).
 */
const PARES: Array<{ fg: string; bg: string; minimo: number; motivo: string }> =
  [
    {
      fg: "fg",
      bg: "surface",
      minimo: 4.5,
      motivo: "texto normal sobre superficie",
    },
    { fg: "fg", bg: "bg", minimo: 4.5, motivo: "texto normal sobre fondo" },
    {
      fg: "fg",
      bg: "surface-sunken",
      minimo: 4.5,
      motivo: "texto normal sobre superficie hundida",
    },
    {
      fg: "fg-muted",
      bg: "surface",
      minimo: 4.5,
      motivo: "texto secundario sobre superficie",
    },
    {
      fg: "fg-muted",
      bg: "bg",
      minimo: 4.5,
      motivo: "texto secundario sobre fondo",
    },
    {
      fg: "fg-muted",
      bg: "surface-sunken",
      minimo: 4.5,
      motivo: "texto secundario sobre superficie hundida",
    },
    {
      fg: "primary-fg",
      bg: "primary",
      minimo: 4.5,
      motivo: "texto sobre botón primario",
    },
    {
      fg: "danger-fg",
      bg: "danger",
      minimo: 4.5,
      motivo: "texto sobre botón de peligro",
    },
    {
      fg: "success-fg",
      bg: "success",
      minimo: 4.5,
      motivo: "texto sobre botón de éxito",
    },
    {
      fg: "warning-fg",
      bg: "warning",
      minimo: 4.5,
      motivo: "texto sobre botón de aviso",
    },
    {
      fg: "info-fg",
      bg: "info",
      minimo: 4.5,
      motivo: "texto sobre botón de información",
    },
    {
      fg: "primary-fg-soft",
      bg: "primary-soft",
      minimo: 4.5,
      motivo: "texto sobre fondo primario suave",
    },
    {
      fg: "danger-fg-soft",
      bg: "danger-soft",
      minimo: 4.5,
      motivo: "texto sobre fondo de peligro suave",
    },
    {
      fg: "success-fg-soft",
      bg: "success-soft",
      minimo: 4.5,
      motivo: "texto sobre fondo de éxito suave",
    },
    {
      fg: "warning-fg-soft",
      bg: "warning-soft",
      minimo: 4.5,
      motivo: "texto sobre fondo de aviso suave",
    },
    {
      fg: "info-fg-soft",
      bg: "info-soft",
      minimo: 4.5,
      motivo: "texto sobre fondo de información suave",
    },
    {
      fg: "border-strong",
      bg: "surface",
      minimo: 3,
      motivo: "borde de control interactivo",
    },
    {
      fg: "focus",
      bg: "surface",
      minimo: 3,
      motivo: "anillo de foco sobre superficie",
    },
    { fg: "focus", bg: "bg", minimo: 3, motivo: "anillo de foco sobre fondo" },
  ];

describe("tokens de diseño", () => {
  it("define los dos esquemas (claro y oscuro) con los tokens base", () => {
    const { claro, oscuro } = cargarEsquemas();
    const obligatorios = [
      "bg",
      "surface",
      "surface-sunken",
      "fg",
      "fg-muted",
      "border",
      "border-strong",
      "focus",
      "primary",
      "primary-hover",
      "primary-fg",
      "primary-soft",
      "primary-fg-soft",
      "danger",
      "danger-fg",
      "success",
      "success-fg",
      "warning",
      "warning-fg",
      "info",
      "info-fg",
    ];
    for (const token of obligatorios) {
      expect(claro, `token claro --${token}`).toHaveProperty(token);
      expect(oscuro, `token oscuro --${token}`).toHaveProperty(token);
    }
  });

  it.each(PARES)("cumple contraste AA en $motivo (claro)", (par) => {
    const { claro } = cargarEsquemas();
    const primerColor = claro[par.fg];
    const segundoColor = claro[par.bg];
    expect(primerColor, `falta el token --${par.fg}`).toBeDefined();
    expect(segundoColor, `falta el token --${par.bg}`).toBeDefined();
    const ratio = contraste(primerColor ?? "", segundoColor ?? "");
    expect(ratio, `--${par.fg} sobre --${par.bg}`).toBeGreaterThanOrEqual(
      par.minimo,
    );
  });

  it.each(PARES)("cumple contraste AA en $motivo (oscuro)", (par) => {
    const { oscuro } = cargarEsquemas();
    const primerColor = oscuro[par.fg];
    const segundoColor = oscuro[par.bg];
    expect(primerColor, `falta el token --${par.fg}`).toBeDefined();
    expect(segundoColor, `falta el token --${par.bg}`).toBeDefined();
    const ratio = contraste(primerColor ?? "", segundoColor ?? "");
    expect(ratio, `--${par.fg} sobre --${par.bg}`).toBeGreaterThanOrEqual(
      par.minimo,
    );
  });
});

/** Recorre los .tsx de las capas de UI y shell buscando colores literales. */
function archivosComponente(directorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...archivosComponente(ruta));
    } else if (ruta.endsWith(".tsx") || ruta.endsWith(".ts")) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

describe("uso de tokens en los componentes", () => {
  it("no contiene colores literales (hex) en las capas de UI y shell", () => {
    const directorios = [
      join(RAIZ, "src/components/ui"),
      join(RAIZ, "src/components/shell"),
    ];
    const infractores: string[] = [];
    for (const directorio of directorios) {
      for (const archivo of archivosComponente(directorio)) {
        if (archivo.includes("/__tests__/")) continue;
        const contenido = readFileSync(archivo, "utf8");
        const coincidencia = contenido.match(/#[0-9a-fA-F]{3,8}\b/g);
        if (coincidencia) {
          infractores.push(
            `${relative(RAIZ, archivo)}: ${coincidencia.join(", ")}`,
          );
        }
      }
    }
    expect(infractores, "usa tokens en lugar de colores literales").toEqual([]);
  });
});

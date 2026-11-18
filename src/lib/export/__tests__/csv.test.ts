/**
 * Tests del generador de CSV de la exportación (P7).
 */

import { describe, expect, it } from "vitest";

import {
  BOM_UTF8,
  SEPARADOR_CSV,
  cabecerasDeArchivo,
  csvDeDescansos,
  csvDeRelevos,
  type FilaDeRelevo,
} from "../csv";

/** Filas de ejemplo: dos tramos y dos costaleros. */
const FILAS: FilaDeRelevo[] = [
  {
    tramo: "Salida",
    ordinal: 1,
    tipo: "salida",
    costalero: "Ana Ruiz",
    estado: "en_paso",
    puesto: "patero izquierdo",
    trabajadera: "Trabajadera 1",
  },
  {
    tramo: "Salida",
    ordinal: 1,
    tipo: "salida",
    costalero: "Beto Solá",
    estado: "descanso",
    puesto: "",
    trabajadera: "Trabajadera 1",
  },
  {
    tramo: "Entrada",
    ordinal: 2,
    tipo: "entrada",
    costalero: "Ana Ruiz",
    estado: "descanso",
    puesto: "",
    trabajadera: "Trabajadera 1",
  },
];

describe("CSV de la exportación", () => {
  it("lleva BOM UTF-8 para que Excel abra los acentos bien", () => {
    const texto = csvDeRelevos(FILAS);

    expect(texto.startsWith(BOM_UTF8)).toBe(true);
    expect(texto.charCodeAt(0)).toBe(0xfeff);
  });

  it("separa las columnas con punto y coma", () => {
    const texto = csvDeRelevos(FILAS);

    expect(SEPARADOR_CSV).toBe(";");
    expect(texto).toContain(
      "tramo;ordinal;tipo;costalero;estado;puesto;trabajadera",
    );
  });

  it("tiene una fila por (tramo, costalero) más la cabecera", () => {
    const texto = csvDeRelevos(FILAS);
    const lineas = texto.split("\r\n").filter((linea) => linea.length > 0);

    expect(lineas).toHaveLength(FILAS.length + 1);
    expect(lineas[1]).toBe(
      "Salida;1;salida;Ana Ruiz;en_paso;patero izquierdo;Trabajadera 1",
    );
    expect(lineas[2]).toBe("Salida;1;salida;Beto Solá;descanso;;Trabajadera 1");
  });

  it("conserva los acentos y las eñes", () => {
    const texto = csvDeRelevos(FILAS);

    expect(texto).toContain("Beto Solá");
  });

  it("entrecomilla las celdas con separador o comilla", () => {
    const texto = csvDeRelevos([
      {
        ...FILAS[0]!,
        tramo: "Salida; vuelta",
        costalero: 'El "Chino"',
      },
    ]);

    expect(texto).toContain('"Salida; vuelta"');
    expect(texto).toContain('"El ""Chino"""');
  });

  it("el CSV de descansos tiene una fila por costalero", () => {
    const texto = csvDeDescansos([
      { costalero: "Ana Ruiz", descansaEn: "Entrada", total: 1 },
      { costalero: "Beto Solá", descansaEn: "Salida", total: 1 },
    ]);
    const lineas = texto.split("\r\n").filter((linea) => linea.length > 0);

    expect(lineas[0]).toBe(
      `${BOM_UTF8}costalero;descansa en;total de descansos`,
    );
    expect(lineas).toHaveLength(3);
    expect(lineas[1]).toBe("Ana Ruiz;Entrada;1");
  });

  it("el nombre del archivo va en ASCII y también en UTF-8", () => {
    const cabeceras = cabecerasDeArchivo("relevos-paso-de-demonstración.csv");

    expect(cabeceras["Content-Type"]).toBe("text/csv; charset=utf-8");
    expect(cabeceras["Content-Disposition"]).toContain(
      'filename="relevos-paso-de-demonstracion.csv"',
    );
    expect(cabeceras["Content-Disposition"]).toContain(
      "filename*=UTF-8''relevos-paso-de-demonstraci%C3%B3n.csv",
    );
  });

  it("con la cabecera sola, el CSV sólo tiene esa línea", () => {
    const texto = csvDeRelevos([]);
    const lineas = texto.split("\r\n").filter((linea) => linea.length > 0);

    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toContain("tramo");
  });
});

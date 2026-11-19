/**
 * Tests de la hoja de relevos del capataz (P6).
 *
 * Lo que se comprueba es lo que el capataz ve en el papel: los puestos de §6
 * en las columnas, los tramos en las filas y el nombre de quien ocupa cada
 * puesto; y que los botones de imprimir y de exportar están.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HojaDeRelevos } from "@/components/features/hoja/HojaDeRelevos";
import type { DatosHoja } from "@/components/features/hoja/tipos";

const PLAN_ID = "55555555-5555-4555-8555-555555555555";

/** Datos de una hoja de ejemplo: una trabajadera, dos tramos. */
function datos(): DatosHoja {
  return {
    paso: {
      id: "paso-1",
      nombre: "Paso de la Soledad",
      anio: 2025,
      cuadrilla: "Costaleros de la Alameda",
    },
    plan: {
      id: PLAN_ID,
      version: 2,
      status: "publicado",
      seed: 20250330,
      created_at: "2025-04-01T10:00:00.000Z",
    },
    hojas: [
      {
        id: "trabajadera-1",
        position: 1,
        tipo: "primera",
        puestos: [
          { indice: 0, nombre: "patero izquierdo", lado: "izquierda" },
          { indice: 1, nombre: "fijador izquierdo", lado: "izquierda" },
          { indice: 2, nombre: "corriente", lado: "centro" },
          { indice: 3, nombre: "fijador derecho", lado: "derecha" },
          { indice: 4, nombre: "patero derecho", lado: "derecha" },
        ],
        filas: [
          {
            tramoId: "tramo-1",
            tramo: "Salida",
            ordinal: 1,
            tipo: "salida",
            personas: [
              {
                costaleroId: "c1",
                nombre: "Ana Ruiz",
                puesto: "patero izquierdo",
              },
              {
                costaleroId: "c2",
                nombre: "Beto Solá",
                puesto: "fijador izquierdo",
              },
              null,
              null,
              null,
            ],
          },
          {
            tramoId: "tramo-2",
            tramo: "Entrada",
            ordinal: 2,
            tipo: "entrada",
            personas: [
              null,
              null,
              { costaleroId: "c3", nombre: "Carmen Paz", puesto: "corriente" },
              null,
              null,
            ],
          },
        ],
      },
    ],
    generado: "1 de abril de 2025",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.print = vi.fn();
});

describe("P6 · hoja de relevos", () => {
  it("enseña la cabecera con el paso, el año, la cuadrilla y la versión", () => {
    render(<HojaDeRelevos datos={datos()} />);

    expect(
      screen.getByText(/Hoja de relevos · Paso de la Soledad/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Costaleros de la Alameda · 2025 · versión 2/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Paso de la Soledad · Costaleros de la Alameda · 2025/),
    ).toBeInTheDocument();
  });

  it("pone los puestos de §6 en las columnas, de izquierda a derecha", () => {
    render(<HojaDeRelevos datos={datos()} />);

    const cabeceras = screen
      .getAllByRole("columnheader")
      .map((celda) => celda.textContent);
    expect(cabeceras).toEqual([
      "Tramo",
      "patero izquierdo",
      "fijador izquierdo",
      "corriente",
      "fijador derecho",
      "patero derecho",
    ]);
    // La primera columna de cada fila es la cabecera de esa fila (§9).
    expect(
      screen.getAllByRole("rowheader").map((celda) => celda.textContent),
    ).toEqual(["1. Salida", "2. Entrada"]);
  });

  it("pone los tramos en las filas con el nombre de quien ocupa cada puesto", () => {
    render(<HojaDeRelevos datos={datos()} />);

    const filas = screen.getAllByRole("row");
    const primera = filas[1];
    expect(primera?.textContent).toContain("1. Salida");
    expect(primera?.textContent).toContain("Ana Ruiz");
    expect(primera?.textContent).toContain("Beto Solá");

    const segunda = filas[2];
    expect(segunda?.textContent).toContain("2. Entrada");
    expect(segunda?.textContent).toContain("Carmen Paz");
  });

  it("tiene un botón de imprimir por hoja y otro para todas", () => {
    render(<HojaDeRelevos datos={datos()} />);

    expect(
      screen.getByRole("button", { name: "Imprimir" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Imprimir todas" }),
    ).toBeInTheDocument();
  });

  it("imprimir llama al print del navegador", async () => {
    render(<HojaDeRelevos datos={datos()} />);

    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));

    await waitFor(() => {
      expect(window.print).toHaveBeenCalled();
    });
  });

  it("enlaza con los dos CSV de la exportación", () => {
    render(<HojaDeRelevos datos={datos()} />);

    const enlaces = screen.getAllByRole("link");
    const hrefs = enlaces.map((enlace) => enlace.getAttribute("href"));
    expect(hrefs).toContain(`/api/export/relevos.csv?planId=${PLAN_ID}`);
    expect(hrefs).toContain(
      `/api/export/plan-por-costalero.csv?planId=${PLAN_ID}`,
    );
  });
});

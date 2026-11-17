import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WizardPaso } from "../WizardPaso";
import type { DatosTramo, PropiedadesWizard } from "../tipos";

const { router } = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () =>
    "/cuadrillas/11111111-1111-4111-8111-111111111111/paso/22222222-2222-4222-8222-222222222222/configuracion",
}));

const CUADRILLA_ID = "11111111-1111-4111-8111-111111111111";
const PASO_ID = "22222222-2222-4222-8222-222222222222";
const T1 = "33333333-3333-4333-8333-333333333331";
const T2 = "33333333-3333-4333-8333-333333333332";
const T3 = "33333333-3333-4333-8333-333333333333";

function idCostalero(indice: number): string {
  return `44444444-4444-4444-8444-${String(indice).padStart(12, "0")}`;
}

function nombreCostalero(indice: number): string {
  return `Costalero ${String(indice).padStart(2, "0")}`;
}

/** Opciones de la pantalla de prueba. */
type OpcionesProps = {
  /** Nº de costaleros de cada trabajadera, por posición. */
  pools?: number[][];
  /** Carga de cada trabajadera. */
  cargas?: number[];
  /** Nº total de costaleros de la cuadrilla. */
  costaleros?: number;
  /** Tramos guardados. */
  tramos?: DatosTramo[];
  /** Boquillas ya elegidas. */
  boquillas?: string[];
};

/** Props del wizard con la configuración que pide cada test. */
function crearProps(opciones: OpcionesProps = {}): PropiedadesWizard {
  const pools = opciones.pools ?? [
    [1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12],
  ];
  const cargas = opciones.cargas ?? [5, 5];
  const totalCostaleros = opciones.costaleros ?? 12;
  const ids = Array.from({ length: totalCostaleros }, (_, indice) =>
    idCostalero(indice + 1),
  );
  const idsTrabajaderas = [T1, T2, T3];

  return {
    paso: {
      id: PASO_ID,
      cuadrilla_id: CUADRILLA_ID,
      name: "Cristo de la Salud",
      season: 2025,
      num_trabajaderas: pools.length,
    },
    cuadrillaId: CUADRILLA_ID,
    trabajaderas: pools.map((pool, indice) => ({
      id: idsTrabajaderas[indice] ?? "",
      position: indice + 1,
      carga: cargas[indice] ?? 5,
      pool: pool.map((numero) => ids[numero - 1] ?? ""),
    })),
    tramos: opciones.tramos ?? [],
    costaleros: ids.map((id, indice) => ({
      id,
      full_name: nombreCostalero(indice + 1),
      nickname: null,
    })),
    boquillas: opciones.boquillas ?? [],
    version: "v1",
  };
}

/** Avanza en el wizard hasta el paso pedido (0 = el primero). */
function irAlPaso(indice: number): void {
  for (let paso = 0; paso < indice; paso += 1) {
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  }
}

describe("W5 · wizard de creación del paso", () => {
  it("el paso 1 muestra los datos del paso y la navegación del wizard", () => {
    render(<WizardPaso {...crearProps()} />);

    expect(
      screen.getByRole("heading", { name: "Datos del paso" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del paso/)).toHaveValue(
      "Cristo de la Salud",
    );
    expect(screen.getByRole("button", { name: "Atrás" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Siguiente" }),
    ).toBeInTheDocument();
  });

  it("el paso 2 muestra el pool de cada trabajadera y marca en rojo las que no tienen suplente (F-4)", () => {
    render(
      <WizardPaso
        {...crearProps({ pools: [[1, 2, 3, 4]], cargas: [5], costaleros: 10 })}
      />,
    );
    irAlPaso(1);

    expect(
      screen.getByRole("heading", { name: "Costaleros del paso" }),
    ).toBeInTheDocument();
    // Pool 4 con carga 5: faltan 2 suplentes (F-4) y queda 1 puesto sin cubrir.
    expect(screen.getByText("F-4 · falta un suplente")).toBeInTheDocument();
    expect(screen.getByText("Puestos sin cubrir")).toBeInTheDocument();
  });

  it("el paso 3 muestra el puesto que le corresponde a cada costalero (§6)", () => {
    render(
      <WizardPaso
        {...crearProps({
          pools: [
            [1, 2, 3, 4, 5],
            [6, 7],
            [8, 9, 10],
          ],
          cargas: [5, 5, 5],
          costaleros: 10,
        })}
      />,
    );
    irAlPaso(2);

    // Primera y última trabajadera: pateros en los extremos.
    const paterosIzquierdos = screen.getAllByRole("row", {
      name: /patero izquierdo/,
    });
    expect(paterosIzquierdos).toHaveLength(2);
    expect(paterosIzquierdos[0]).toHaveTextContent("Costalero 01");
    expect(paterosIzquierdos[1]).toHaveTextContent("Costalero 08");

    // Working position intermedia: costeros en los extremos.
    const costeroIzquierdo = screen.getByRole("row", {
      name: /costero izquierdo/,
    });
    expect(costeroIzquierdo).toHaveTextContent("Costalero 06");

    // El corriente está en el centro de cada trabajadera.
    const corrientes = screen.getAllByRole("row", { name: /corriente/ });
    expect(corrientes).toHaveLength(3);
    expect(corrientes[0]).toHaveTextContent("Costalero 03");
  });

  it("el paso 5 propone el número de tramos que hacen falta y muestra el detalle por trabajadera", () => {
    // Pool 10 con carga 5 → r = 5 → ceil(2·10/5) = 4 tramos (§7.3).
    render(
      <WizardPaso
        {...crearProps({
          pools: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
          cargas: [5],
          costaleros: 10,
        })}
      />,
    );
    irAlPaso(4);

    expect(screen.getByLabelText(/Número de tramos del recorrido/)).toHaveValue(
      4,
    );
    expect(screen.getByText("Descansan por tramo")).toBeInTheDocument();
    expect(screen.getByText("Descansos por persona")).toBeInTheDocument();
    expect(screen.getByText("Tramos que faltan")).toBeInTheDocument();
  });

  it("el paso 5 propone 12 tramos cuando el pool es 6 y la carga 5 (§7.3)", () => {
    render(
      <WizardPaso
        {...crearProps({
          pools: [[1, 2, 3, 4, 5, 6]],
          cargas: [5],
          costaleros: 10,
        })}
      />,
    );
    irAlPaso(4);

    expect(screen.getByLabelText(/Número de tramos del recorrido/)).toHaveValue(
      12,
    );
  });

  it("el paso 6 muestra el checklist F-1..F-6 y bloquea el plan cuando falta un suplente", () => {
    render(
      <WizardPaso
        {...crearProps({
          pools: [[1, 2, 3, 4, 5]],
          cargas: [5],
          costaleros: 10,
          tramos: [
            { id: "tr1", name: "Salida", ordinal: 1, kind: "salida" },
            { id: "tr2", name: "Entrada", ordinal: 2, kind: "entrada" },
          ],
          boquillas: [idCostalero(1), idCostalero(2)],
        })}
      />,
    );
    irAlPaso(5);

    // El checklist muestra las seis precondiciones con su ID.
    for (const id of ["F-1", "F-2", "F-3", "F-4", "F-5", "F-6"]) {
      expect(screen.getByText(id)).toBeInTheDocument();
    }
    // F-1 en rojo: la trabajadera de pool 5 y carga 5 no tiene suplentes.
    expect(screen.getAllByText(/no tiene suplentes/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("no cumple").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Calcular plan de relevos" }),
    ).toBeDisabled();
  });

  it("el paso 6 habilita el plan cuando el paso es factible y lleva a la pantalla del plan", () => {
    render(
      <WizardPaso
        {...crearProps({
          pools: [[1, 2, 3, 4, 5, 6]],
          cargas: [5],
          costaleros: 10,
          tramos: Array.from({ length: 12 }, (_, indice) => ({
            id: `tr${String(indice + 1)}`,
            name: `Tramo ${String(indice + 1)}`,
            ordinal: indice + 1,
            kind:
              indice === 0
                ? ("salida" as const)
                : indice === 11
                  ? ("entrada" as const)
                  : ("normal" as const),
          })),
          boquillas: [idCostalero(1), idCostalero(2)],
        })}
      />,
    );
    irAlPaso(5);

    const boton = screen.getByRole("button", {
      name: "Calcular plan de relevos",
    });
    expect(boton).toBeEnabled();
    fireEvent.click(boton);
    expect(router.push).toHaveBeenCalledWith(
      `/cuadrillas/${CUADRILLA_ID}/paso/${PASO_ID}/plan`,
    );
  });
});

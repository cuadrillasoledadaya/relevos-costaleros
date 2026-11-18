import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { avisosDeCoherencia } from "@/domain/tramos";
import { PantallaTramos } from "@/components/features/tramos/PantallaTramos";
import type { DatosPantallaTramos } from "@/components/features/tramos/tipos";

const { router, acciones } = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  },
  acciones: {
    crearTramo: vi.fn(),
    renombrarTramo: vi.fn(),
    reordenarTramos: vi.fn(),
    eliminarTramo: vi.fn(),
    cambiarTipoTramo: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/server/actions/tramo", () => acciones);

const CUADRILLA_ID = "11111111-1111-4111-8111-111111111111";
const PASO_ID = "22222222-2222-4222-8222-222222222222";
const TRAMO_SALIDA = "33333333-3333-4333-8333-333333333331";
const TRAMO_MEDIO = "33333333-3333-4333-8333-333333333332";
const TRAMO_ENTRADA = "33333333-3333-4333-8333-333333333333";
const TRABAJADORA_1 = "44444444-4444-4444-8444-444444444441";
const TRABAJADORA_2 = "44444444-4444-4444-8444-444444444442";

type TramoPrueba = DatosPantallaTramos["tramos"][number];

type RespuestaAccion =
  | {
      ok: true;
      mensaje: string;
      datos: {
        tramos: TramoPrueba[];
        avisos: ReturnType<typeof avisosDeCoherencia>;
      };
    }
  | { ok: false; error: string };

const estado = {
  tramos: [] as TramoPrueba[],
  siguienteId: 1,
};

function tramo(
  id: string,
  name: string,
  ordinal: number,
  kind: TramoPrueba["kind"],
): TramoPrueba {
  return { id, name, ordinal, kind };
}

function tramosIniciales(): TramoPrueba[] {
  return [
    tramo(TRAMO_SALIDA, "Salida", 1, "salida"),
    tramo(TRAMO_MEDIO, "Tramo medio", 2, "normal"),
    tramo(TRAMO_ENTRADA, "Entrada", 3, "entrada"),
  ];
}

/** Normaliza el estado como lo hace el servidor: ordinales y tipos canónicos. */
function normalizar(tramos: TramoPrueba[]): TramoPrueba[] {
  const ordenados = [...tramos].sort((a, b) => a.ordinal - b.ordinal);
  return ordenados.map((actual, indice) => ({
    ...actual,
    ordinal: indice + 1,
    kind:
      indice === 0
        ? ("salida" as const)
        : indice === ordenados.length - 1
          ? ("entrada" as const)
          : ("normal" as const),
  }));
}

function resultadoExitoso(mensaje: string): RespuestaAccion {
  const tramos = normalizar(estado.tramos);
  estado.tramos = tramos;
  return {
    ok: true,
    mensaje,
    datos: { tramos, avisos: avisosDeCoherencia(tramos) },
  };
}

function crearProps(
  tramos: TramoPrueba[] = tramosIniciales(),
): DatosPantallaTramos {
  const pool = Array.from(
    { length: 10 },
    (_, indice) =>
      `55555555-5555-4555-8555-${String(indice + 1).padStart(12, "0")}`,
  );

  return {
    paso: {
      id: PASO_ID,
      cuadrilla_id: CUADRILLA_ID,
      name: "Cristo de la Salud",
      season: 2025,
    },
    trabajadoras: [
      {
        id: TRABAJADORA_1,
        position: 1,
        carga: 5,
        pool,
      },
      {
        id: TRABAJADORA_2,
        position: 2,
        carga: 5,
        pool,
      },
    ],
    tramos,
    boquillas: [pool[0] ?? "", pool[1] ?? ""],
    avisos: avisosDeCoherencia(tramos),
  };
}

function tablaTramos(): HTMLElement {
  return screen.getByRole("table", { name: "Tramos del recorrido" });
}

function filasTramos(): HTMLElement[] {
  return within(tablaTramos()).getAllByRole("row").slice(1);
}

function valoresNombres(): string[] {
  return filasTramos().map(
    (fila) =>
      (
        fila.querySelector(
          'input[aria-label^="Nombre del tramo"]',
        ) as HTMLInputElement
      ).value,
  );
}

function ordinales(): string[] {
  return filasTramos().map(
    (fila) => fila.querySelector("td")?.textContent?.trim() ?? "",
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  estado.tramos = tramosIniciales();
  estado.siguienteId = 1;

  acciones.crearTramo.mockImplementation(async ({ nombre }) => {
    estado.tramos.push(
      tramo(
        `nuevo-${String(estado.siguienteId)}`,
        nombre,
        estado.tramos.length + 1,
        "normal",
      ),
    );
    estado.siguienteId += 1;
    return resultadoExitoso("Tramo añadido al recorrido.");
  });

  acciones.renombrarTramo.mockImplementation(async ({ tramoId, nombre }) => {
    const encontrado = estado.tramos.find((actual) => actual.id === tramoId);
    if (!encontrado) return { ok: false, error: "El tramo no existe." };
    encontrado.name = nombre;
    return resultadoExitoso("Tramo renombrado.");
  });

  acciones.reordenarTramos.mockImplementation(
    async ({ orden }: { orden: string[] }) => {
      const porId = new Map(estado.tramos.map((actual) => [actual.id, actual]));
      estado.tramos = orden.flatMap((id, indice) => {
        const encontrado = porId.get(id);
        return encontrado ? [{ ...encontrado, ordinal: indice + 1 }] : [];
      });
      return resultadoExitoso("Recorrido reordenado.");
    },
  );

  acciones.eliminarTramo.mockImplementation(async ({ tramoId }) => {
    estado.tramos = estado.tramos.filter((actual) => actual.id !== tramoId);
    return resultadoExitoso("Tramo borrado del recorrido.");
  });

  acciones.cambiarTipoTramo.mockImplementation(async ({ tramoId, tipo }) => {
    const encontrado = estado.tramos.find((actual) => actual.id === tramoId);
    if (!encontrado) return { ok: false, error: "El tramo no existe." };
    encontrado.kind = tipo;
    const tramos = [...estado.tramos].sort((a, b) => a.ordinal - b.ordinal);
    return {
      ok: true,
      mensaje: "Tipo del tramo cambiado.",
      datos: { tramos, avisos: avisosDeCoherencia(tramos) },
    };
  });
});

describe("W6 · pantalla de apartados de tramos", () => {
  it("añade un tramo, lo muestra en la lista y actualiza la factibilidad sin recargar la página", async () => {
    estado.tramos = tramosIniciales().slice(0, 2);
    render(<PantallaTramos {...crearProps(estado.tramos)} />);

    expect(
      screen.getByText("Faltan 2 tramos para que todos descansen 2 veces"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nombre del nuevo tramo/), {
      target: { value: "Vuelta a la plaza" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir tramo" }));

    expect(
      await screen.findByDisplayValue("Vuelta a la plaza"),
    ).toBeInTheDocument();
    expect(acciones.crearTramo).toHaveBeenCalledWith({
      pasoId: PASO_ID,
      nombre: "Vuelta a la plaza",
    });
    expect(ordinales()).toEqual(["1", "2", "3"]);
    expect(
      await screen.findByText(
        "Faltan 1 tramos para que todos descansen 2 veces",
      ),
    ).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("renombra un tramo", async () => {
    render(<PantallaTramos {...crearProps()} />);

    fireEvent.change(screen.getByLabelText("Nombre del tramo 2"), {
      target: { value: "Plaza del pueblo" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar nombre del tramo 2" }),
    );

    expect(
      await screen.findByDisplayValue("Plaza del pueblo"),
    ).toBeInTheDocument();
    expect(acciones.renombrarTramo).toHaveBeenCalledWith({
      pasoId: PASO_ID,
      tramoId: TRAMO_MEDIO,
      nombre: "Plaza del pueblo",
    });
    expect(ordinales()).toEqual(["1", "2", "3"]);
  });

  it("mueve un tramo arriba y abajo sin dejar ordinales repetidos ni huecos", async () => {
    render(<PantallaTramos {...crearProps()} />);

    fireEvent.click(screen.getByRole("button", { name: "Subir tramo 2" }));

    await waitFor(() =>
      expect(valoresNombres()).toEqual(["Tramo medio", "Salida", "Entrada"]),
    );
    expect(ordinales()).toEqual(["1", "2", "3"]);

    fireEvent.click(screen.getByRole("button", { name: "Bajar tramo 1" }));

    await waitFor(() =>
      expect(valoresNombres()).toEqual(["Salida", "Tramo medio", "Entrada"]),
    );
    expect(ordinales()).toEqual(["1", "2", "3"]);
    expect(acciones.reordenarTramos).toHaveBeenCalledTimes(2);
  });

  it("pide confirmación al borrar un tramo intermedio y renumera los que quedan", async () => {
    render(<PantallaTramos {...crearProps()} />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar tramo 2" }));

    const dialogo = screen.getByRole("dialog", { name: "Eliminar tramo" });
    expect(acciones.eliminarTramo).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Eliminar tramo" }),
    );

    await waitFor(() => expect(filasTramos()).toHaveLength(2));
    expect(valoresNombres()).toEqual(["Salida", "Entrada"]);
    expect(ordinales()).toEqual(["1", "2"]);
    expect(acciones.eliminarTramo).toHaveBeenCalledWith({
      pasoId: PASO_ID,
      tramoId: TRAMO_MEDIO,
    });
  });

  it("no guarda un tramo sin nombre y muestra el mensaje en español", () => {
    render(<PantallaTramos {...crearProps()} />);

    fireEvent.change(screen.getByLabelText(/Nombre del nuevo tramo/), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir tramo" }));

    expect(acciones.crearTramo).not.toHaveBeenCalled();
    expect(
      screen.getByText("El nombre del tramo no puede estar vacío."),
    ).toBeInTheDocument();
  });

  it("con T = 2 muestra F-2 en rojo y explica cuántos tramos faltan", () => {
    render(<PantallaTramos {...crearProps(tramosIniciales().slice(0, 2))} />);

    expect(screen.getByText("F-2 · no cumple")).toBeInTheDocument();
    const mensaje = screen.getByText(
      "Faltan 2 tramos para que todos descansen 2 veces",
    );
    expect(mensaje).toHaveClass("text-danger");
    expect(mensaje.closest('[role="alert"]')).toHaveClass("bg-danger-soft");
  });

  it("permite forzar el tipo de un tramo y muestra los avisos de coherencia", async () => {
    render(<PantallaTramos {...crearProps()} />);

    fireEvent.change(screen.getByLabelText("Tipo del tramo 1"), {
      target: { value: "normal" },
    });

    expect(await screen.findByText("F-2 · no cumple")).toBeInTheDocument();
    expect(acciones.cambiarTipoTramo).toHaveBeenCalledWith({
      pasoId: PASO_ID,
      tramoId: TRAMO_SALIDA,
      tipo: "normal",
    });
    expect(
      await screen.findByText(
        "El primer tramo del recorrido («Salida») no es la salida.",
      ),
    ).toBeInTheDocument();
  });
});

/**
 * Tests de la pantalla P5 (plan de relevos).
 *
 * El servidor entrega el plan **ya leído de la base de datos y verificado**;
 * aquí se comprueba que la pantalla lo enseña tal cual (los mismos nombres),
 * que no enseña un plan que no lo pasa y que muestra el diagnóstico con sus
 * cifras y su sugerencia (§9, §11.3, S-5).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PantallaPlan } from "@/components/features/plan/PantallaPlan";
import type { DatosPantallaPlan } from "@/components/features/plan/tipos";
import type { PlanStats } from "@/domain/modelo";

const { router, acciones } = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  },
  acciones: {
    calcularPlan: vi.fn(),
    publicarPlan: vi.fn(),
    crearTramo: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/server/actions/plan", () => ({
  calcularPlan: acciones.calcularPlan,
  publicarPlan: acciones.publicarPlan,
}));

vi.mock("@/server/actions/tramo", () => ({
  crearTramo: acciones.crearTramo,
}));

const CUADRILLA_ID = "11111111-1111-4111-8111-111111111111";
const PASO_ID = "22222222-2222-4222-8222-222222222222";
const TRAMO_SALIDA = "33333333-3333-4333-8333-333333333331";
const TRAMO_ENTRADA = "33333333-3333-4333-8333-333333333333";
const TRABAJADORA = "44444444-4444-4444-8444-444444444441";
const PLAN_ID = "55555555-5555-4555-8555-555555555555";

const TRAMOS: DatosPantallaPlan["tramos"] = [
  { id: TRAMO_SALIDA, name: "Salida", ordinal: 1, kind: "salida" },
  { id: TRAMO_ENTRADA, name: "Entrada", ordinal: 2, kind: "entrada" },
];

const PERSONAS: DatosPantallaPlan["personas"] = [
  { id: "c1", nombre: "Ana Ruiz", esBoquilla: true },
  { id: "c2", nombre: "Beto Solá", esBoquilla: true },
  { id: "c3", nombre: "Carmen Paz", esBoquilla: false },
];

const TRABAJADORAS: DatosPantallaPlan["trabajadoras"] = [
  { id: TRABAJADORA, position: 1, carga: 2, pool: ["c1", "c2", "c3"] },
];

const PLAN: DatosPantallaPlan["plan"] = {
  id: PLAN_ID,
  version: 2,
  status: "publicado",
  seed: 20250330,
  estados: {
    [TRAMO_SALIDA]: { c1: "en_paso", c2: "descanso", c3: "en_paso" },
    [TRAMO_ENTRADA]: { c1: "descanso", c2: "en_paso", c3: "en_paso" },
  },
  porTrabajadera: {
    [TRAMO_SALIDA]: {
      [TRABAJADORA]: { enPaso: ["c1", "c3"], descansan: ["c2"] },
    },
    [TRAMO_ENTRADA]: {
      [TRABAJADORA]: { enPaso: ["c2", "c3"], descansan: ["c1"] },
    },
  },
};

const ESTADISTICAS: PlanStats = {
  descansosPorCostalero: { c1: 1, c2: 1, c3: 0 },
  descansosPorTrabajadera: { [TRABAJADORA]: { c1: 1, c2: 1, c3: 0 } },
  dispercionPorTrabajadera: { [TRABAJADORA]: 1 },
  dispercionGlobal: 1,
  solapamientoSalidaEntrada: 0,
  cumplimiento: {
    r1: true,
    r2: true,
    r3: true,
    r4: true,
    r5: { valor: 0, maximo: 2 },
  },
};

const VERSIONES: DatosPantallaPlan["versiones"] = [
  {
    id: PLAN_ID,
    version: 2,
    status: "publicado",
    seed: 20250330,
    created_at: "2025-04-01T10:00:00.000Z",
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    version: 1,
    status: "borrador",
    seed: 20250329,
    created_at: "2025-03-30T10:00:00.000Z",
  },
];

/** Los datos que la página entrega al componente cliente. */
function datos(extra: Partial<DatosPantallaPlan> = {}): DatosPantallaPlan {
  return {
    paso: {
      id: PASO_ID,
      cuadrilla_id: CUADRILLA_ID,
      name: "Paso de la Soledad",
      season: 2025,
    },
    trabajadoras: TRABAJADORAS,
    tramos: TRAMOS,
    personas: PERSONAS,
    versiones: VERSIONES,
    plan: PLAN,
    estadisticas: ESTADISTICAS,
    planCumple: true,
    semillaPorDefecto: 20250330,
    ...extra,
  };
}

/** Renderiza la pantalla con los datos dados. */
function montar(extra: Partial<DatosPantallaPlan> = {}) {
  return render(
    <PantallaPlan
      {...datos(extra)}
      cuadrillaId={CUADRILLA_ID}
      pasoId={PASO_ID}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  acciones.calcularPlan.mockResolvedValue({
    ok: true,
    mensaje: "Plan de relevos guardado como versión 3.",
    datos: { planId: PLAN_ID, version: 3, stats: ESTADISTICAS },
  });
  acciones.publicarPlan.mockResolvedValue({
    ok: true,
    mensaje: "Plan publicado: los costaleros ya lo ven.",
    datos: { planId: PLAN_ID },
  });
  acciones.crearTramo.mockResolvedValue({
    ok: true,
    mensaje: "Tramo añadido al recorrido.",
    datos: { tramos: TRAMOS, avisos: [] },
  });
});

describe("P5 · pantalla del plan de relevos", () => {
  it("muestra los mismos nombres que tiene el plan", () => {
    montar();

    // Vista por tramo: Ana y Carmen van en el paso en la salida, Beto descansa.
    expect(screen.getAllByText("Ana Ruiz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Carmen Paz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beto Solá").length).toBeGreaterThan(0);
    expect(screen.getByText("Descansan: Beto Solá")).toBeInTheDocument();
  });

  it("muestra, por costalero, los tramos en los que descansa", () => {
    montar();

    fireEvent.click(screen.getByRole("tab", { name: "Por costalero" }));

    const fila = screen.getByText("Beto Solá").closest("tr");
    expect(fila).not.toBeNull();
    expect(fila?.textContent).toContain("Salida");
  });

  it("no muestra un plan que no supera la verificación", () => {
    montar({ planCumple: false });

    expect(
      screen.getByText("Este plan ya no encaja con el paso"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ana Ruiz")).toBeNull();
  });

  it("muestra el estado vacío cuando el paso no tiene plan", () => {
    montar({ plan: null, estadisticas: null, versiones: [] });

    expect(
      screen.getByText("Todavía no hay plan de relevos"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Calcular plan de relevos" }),
    ).toBeInTheDocument();
  });

  it("el panel de estadísticas enseña la media, la dispersión y R1 a R5", () => {
    montar();

    fireEvent.click(screen.getByRole("tab", { name: "Estadísticas" }));

    expect(screen.getByText(/Media de descansos/)).toBeInTheDocument();
    expect(screen.getByText("Dispersión global")).toBeInTheDocument();
    expect(screen.getAllByText("Cumple").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("R5")).toBeInTheDocument();
  });

  it("el historial marca la versión publicada y permite publicar las demás", () => {
    montar();

    fireEvent.click(screen.getByRole("tab", { name: "Historial" }));

    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Publicar" }),
    ).toBeInTheDocument();
  });

  it("calcula el plan con la semilla y, si se pide, prueba varias", async () => {
    montar({ plan: null, estadisticas: null, versiones: [] });

    fireEvent.click(
      screen.getByRole("button", { name: "Calcular plan de relevos" }),
    );

    await waitFor(() => {
      expect(acciones.calcularPlan).toHaveBeenCalledWith({
        pasoId: PASO_ID,
        seed: 20250330,
        semillas: undefined,
      });
    });

    fireEvent.click(screen.getByLabelText(/Probar varias semillas/));
    fireEvent.click(
      screen.getByRole("button", { name: "Calcular plan de relevos" }),
    );

    await waitFor(() => {
      expect(acciones.calcularPlan).toHaveBeenLastCalledWith({
        pasoId: PASO_ID,
        seed: 20250330,
        semillas: [20250330, 20250331, 20250332, 20250333, 20250334],
      });
    });
  });

  it("publica la versión elegida desde el historial", async () => {
    montar();

    fireEvent.click(screen.getByRole("tab", { name: "Historial" }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => {
      expect(acciones.publicarPlan).toHaveBeenCalledWith({
        planId: "66666666-6666-4666-8666-666666666666",
      });
    });
  });

  it("un plan imposible muestra el diagnóstico con sus cifras y su sugerencia", async () => {
    acciones.calcularPlan.mockResolvedValue({
      ok: false,
      error: "Faltan 2 tramos para que todos descansen 2 veces",
      diagnostico: {
        codigo: "CUPO_INSUFICIENTE",
        mensaje: "Faltan 2 tramos para que todos descansen 2 veces",
        cifras: { pool: 5, carga: 5, r: 0, T: 4, tramosFaltantes: 2 },
        sugerencia: "agregar 2 tramos al recorrido (T actual 4)",
      },
    });

    montar({ plan: null, estadisticas: null, versiones: [] });
    fireEvent.click(
      screen.getByRole("button", { name: "Calcular plan de relevos" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("El plan no se puede calcular todavía"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Código: CUPO_INSUFICIENTE/)).toBeInTheDocument();
    expect(
      screen.getByText(/agregar 2 tramos al recorrido/),
    ).toBeInTheDocument();
    expect(screen.getByText("tramosFaltantes: 2")).toBeInTheDocument();
  });

  it("aplicar la sugerencia añade los tramos que faltan y vuelve a calcular", async () => {
    acciones.calcularPlan.mockResolvedValue({
      ok: false,
      error: "Faltan 2 tramos para que todos descansen 2 veces",
      diagnostico: {
        codigo: "CUPO_INSUFICIENTE",
        mensaje: "Faltan 2 tramos para que todos descansen 2 veces",
        cifras: { T: 4, tramosFaltantes: 2 },
        sugerencia: "agregar 2 tramos al recorrido (T actual 4)",
      },
    });

    montar({ plan: null, estadisticas: null, versiones: [] });
    fireEvent.click(
      screen.getByRole("button", { name: "Calcular plan de relevos" }),
    );
    await waitFor(() => {
      expect(
        screen.getByText("El plan no se puede calcular todavía"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Aplicar la sugerencia/ }),
    );

    await waitFor(() => {
      expect(acciones.crearTramo).toHaveBeenCalledTimes(2);
    });
    expect(acciones.crearTramo).toHaveBeenCalledWith({
      pasoId: PASO_ID,
      nombre: "Tramo 3",
    });
  });

  it("si lo que falta es el pool, lleva a la configuración del paso", async () => {
    acciones.calcularPlan.mockResolvedValue({
      ok: false,
      error: "La trabajadera 1 no tiene suplentes",
      diagnostico: {
        codigo: "SIN_SUPLENTES",
        mensaje: "La trabajadera 1 no tiene suplentes",
        cifras: { pool: 5, carga: 5, r: 0 },
        sugerencia: "asignar 1 suplente más",
      },
    });

    montar({ plan: null, estadisticas: null, versiones: [] });
    fireEvent.click(
      screen.getByRole("button", { name: "Calcular plan de relevos" }),
    );
    await waitFor(() => {
      expect(
        screen.getByText("El plan no se puede calcular todavía"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Aplicar la sugerencia/ }),
    );

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        `/cuadrillas/${CUADRILLA_ID}/paso/${PASO_ID}/configuracion`,
      );
    });
    expect(acciones.crearTramo).not.toHaveBeenCalled();
  });
});

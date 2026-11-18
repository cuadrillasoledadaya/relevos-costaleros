/**
 * Tests de las server actions del plan de relevos (`src/server/actions/plan.ts`).
 *
 * El servicio del plan se inyecta, así que las acciones se prueban sin base de
 * datos: lo que se comprueba es el contrato de la acción (validación, sesión,
 * mensaje en español y datos de vuelta).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { calcularPlan, publicarPlan } from "@/server/actions/plan";
import type { ServicioPlan } from "@/server/plan/servicio";

const PASO_ID = "22222222-2222-4222-8222-222222222222";
const PLAN_ID = "33333333-3333-4333-8333-333333333333";
const CAPATAZ_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const STATS = {
  descansosPorCostalero: {},
  descansosPorTrabajadera: {},
  dispercionPorTrabajadera: {},
  dispercionGlobal: 0,
  solapamientoSalidaEntrada: 0,
  cumplimiento: {
    r1: true,
    r2: true,
    r3: true,
    r4: true,
    r5: { valor: 0, maximo: 0 },
  },
};

const { dobles } = vi.hoisted(() => ({
  dobles: {
    calcularYGuardar: vi.fn(),
    listarHistorial: vi.fn(),
    publicar: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/** Un servicio del plan con sus dobles. */
function servicio(): ServicioPlan {
  return {
    calcularYGuardar: dobles.calcularYGuardar,
    listarHistorial: dobles.listarHistorial,
    publicar: dobles.publicar,
  } as unknown as ServicioPlan;
}

describe("server actions del plan de relevos", () => {
  it("calcula el plan y devuelve su versión y sus estadísticas", async () => {
    dobles.calcularYGuardar.mockResolvedValue({
      ok: true,
      planId: PLAN_ID,
      version: 2,
      stats: STATS,
    });

    const resultado = await calcularPlan(
      { pasoId: PASO_ID, seed: 20250330 },
      { usuarioId: CAPATAZ_ID, servicio: servicio() },
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain("versión 2");
    expect(resultado.datos.planId).toBe(PLAN_ID);
    expect(resultado.datos.version).toBe(2);
    expect(dobles.calcularYGuardar).toHaveBeenCalledWith(
      { pasoId: PASO_ID, seed: 20250330 },
      CAPATAZ_ID,
    );
  });

  it("un plan imposible devuelve el diagnóstico con su sugerencia", async () => {
    dobles.calcularYGuardar.mockResolvedValue({
      ok: false,
      tipo: "infeasible",
      diagnostico: {
        codigo: "SIN_SUPLENTES",
        mensaje: "La trabajadera 1 no tiene suplentes",
        cifras: { pool: 5, carga: 5, r: 0 },
        sugerencia: "asignar 1 suplente más",
      },
    });

    const resultado = await calcularPlan(
      { pasoId: PASO_ID },
      { usuarioId: CAPATAZ_ID, servicio: servicio() },
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain("suplentes");
    expect(resultado.diagnostico?.codigo).toBe("SIN_SUPLENTES");
    expect(resultado.diagnostico?.sugerencia).toBe("asignar 1 suplente más");
  });

  it("sin sesión no calcula nada", async () => {
    const resultado = await calcularPlan(
      { pasoId: PASO_ID },
      { usuarioId: null, servicio: servicio() },
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBe("No hay ninguna sesión iniciada.");
    expect(dobles.calcularYGuardar).not.toHaveBeenCalled();
  });

  it("rechaza un paso que no es un identificador válido", async () => {
    const resultado = await calcularPlan(
      { pasoId: "no-es-un-uuid" },
      { usuarioId: CAPATAZ_ID, servicio: servicio() },
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain("UUID");
    expect(dobles.calcularYGuardar).not.toHaveBeenCalled();
  });

  it("publica el plan y lo dice en español", async () => {
    dobles.publicar.mockResolvedValue({ ok: true });

    const resultado = await publicarPlan(
      { planId: PLAN_ID },
      { usuarioId: CAPATAZ_ID, servicio: servicio() },
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain("publicado");
    expect(resultado.datos.planId).toBe(PLAN_ID);
    expect(dobles.publicar).toHaveBeenCalledWith(PLAN_ID, CAPATAZ_ID);
  });

  it("no publica un plan que no es del capataz", async () => {
    dobles.publicar.mockResolvedValue({
      ok: false,
      tipo: "sin_permiso",
      error: "No tienes permisos para operar con los planes de este paso.",
    });

    const resultado = await publicarPlan(
      { planId: PLAN_ID },
      { usuarioId: CAPATAZ_ID, servicio: servicio() },
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain("permisos");
  });
});

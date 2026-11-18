/**
 * Tests de `POST /api/solve` (§12): el endpoint calcula el plan de relevos y lo devuelve
 * SIN persistirlo (persistir `planes` y `relevos` es de otro endpoint).
 *
 * Los dobles son de módulo: la sesión de Supabase y los repositorios de `pasos` y
 * `cuadrillas` se sustituyen para poder comprobar la autorización (401 y 403) sin base de
 * datos. El solver NO se sustituye: se envuelve en un spy que llama al solver real, de
 * modo que la respuesta de la API se pueda comparar con su resultado.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RelevoPlanInput, RelevoPlanResult } from "@/domain/modelo";
import { solvePlanDeRelevos } from "@/domain/solver";
import { CODIGOS_DIAGNOSTICO } from "@/domain/solver/diagnostico";

const { dobles } = vi.hoisted(() => ({
  dobles: {
    getUser: vi.fn(),
    obtenerPaso: vi.fn(),
    obtenerCuadrilla: vi.fn(),
  },
}));

vi.mock("@/server/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: dobles.getUser,
      getSession: vi.fn(async () => ({
        data: { session: null },
        error: null,
      })),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));

vi.mock("@/server/repos/pasos", () => ({
  crearRepositorioPasos: vi.fn(() => ({ obtenerPorId: dobles.obtenerPaso })),
}));

vi.mock("@/server/repos/cuadrillas", () => ({
  crearRepositorioCuadrillas: vi.fn(() => ({
    obtenerPorId: dobles.obtenerCuadrilla,
  })),
}));

vi.mock("@/domain/solver", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/domain/solver")>();
  return {
    ...original,
    solvePlanDeRelevos: vi.fn(original.solvePlanDeRelevos),
  };
});

import { POST } from "../route";

const PASO_ID = "22222222-2222-4222-8222-222222222222";
const CUADRILLA_ID = "11111111-1111-4111-8111-111111111111";
const CAPATAZ_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTRO_CAPATAZ_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const COSTALERO_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/** Tramos del recorrido: el primero es `salida` y el último `entrada` (§8.3). */
function crearTramos(cantidad: number): RelevoPlanInput["tramos"] {
  return Array.from({ length: cantidad }, (_, indice) => {
    const ordinal = indice + 1;
    const kind =
      ordinal === 1 ? "salida" : ordinal === cantidad ? "entrada" : "normal";
    return {
      id: `tramo-${String(ordinal)}`,
      name: `Tramo ${String(ordinal)}`,
      ordinal,
      kind,
    };
  });
}

/** Caso canónico: 1 trabajadera, pool 6, carga 5 → hacen falta 12 tramos (§7.3). */
const ENTRADA_VALIDA: RelevoPlanInput = {
  pasoId: PASO_ID,
  trabajaderas: [
    {
      id: "trabajadera-1",
      position: 1,
      carga: 5,
      pool: ["c1", "c2", "c3", "c4", "c5", "c6"],
    },
  ],
  tramos: crearTramos(12),
  boquillas: ["c1", "c2"],
  opciones: { seed: 20250330 },
};

/** El mismo paso sin suplentes (pool 5, carga 5): no hay plan posible (§7.4, F-1). */
const ENTRADA_IMPOSIBLE: RelevoPlanInput = {
  ...ENTRADA_VALIDA,
  trabajaderas: [
    {
      id: "trabajadera-1",
      position: 1,
      carga: 5,
      pool: ["c1", "c2", "c3", "c4", "c5"],
    },
  ],
};

/** Petición POST con el cuerpo JSON dado. */
function peticion(cuerpo: unknown): Request {
  return new Request("https://relevos.test/api/solve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  dobles.getUser.mockResolvedValue({
    data: { user: { id: CAPATAZ_ID } },
    error: null,
  });
  dobles.obtenerPaso.mockResolvedValue({
    data: {
      id: PASO_ID,
      cuadrilla_id: CUADRILLA_ID,
      name: "Cristo de la Salud",
      season: 2025,
      num_trabajadoras: 1,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    },
    error: null,
  });
  dobles.obtenerCuadrilla.mockResolvedValue({
    data: {
      id: CUADRILLA_ID,
      name: "Los del Carmen",
      season: 2025,
      owner_id: CAPATAZ_ID,
      notes: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    },
    error: null,
  });
});

describe("W7 · POST /api/solve", () => {
  it("responde 200 con ok:true y exactamente el resultado de solvePlanDeRelevos", async () => {
    const respuesta = await POST(peticion(ENTRADA_VALIDA));

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as RelevoPlanResult;
    expect(cuerpo.ok).toBe(true);

    const spy = vi.mocked(solvePlanDeRelevos);
    expect(spy).toHaveBeenCalledTimes(1);
    const resultadoDelSolver = spy.mock.results[0]?.value;
    expect(cuerpo).toEqual(resultadoDelSolver);

    // El spy envuelve al solver real: la respuesta es la suya, sin recortes.
    const { solvePlanDeRelevos: solverReal } =
      await vi.importActual<typeof import("@/domain/solver")>(
        "@/domain/solver",
      );
    expect(cuerpo).toEqual(solverReal(ENTRADA_VALIDA));
  });

  it("responde 200 con ok:false y un diagnóstico con cifras y sugerencia si el plan es imposible", async () => {
    const respuesta = await POST(peticion(ENTRADA_IMPOSIBLE));

    // Un plan imposible no es un error: es un 200 con `ok: false`.
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as RelevoPlanResult;
    expect(cuerpo.ok).toBe(false);
    if (cuerpo.ok) return;

    const diagnostico = cuerpo.diagnostico;
    expect(CODIGOS_DIAGNOSTICO).toContain(diagnostico.codigo);
    expect(diagnostico.codigo).toBe("SIN_SUPLENTES");
    expect(diagnostico.cifras["pool"]).toBe(5);
    expect(diagnostico.cifras["carga"]).toBe(5);
    expect(diagnostico.cifras["r"]).toBe(0);
    expect(Object.keys(diagnostico.cifras).length).toBeGreaterThan(0);
    // El mensaje lleva los números dentro (§11.4) y la sugerencia es accionable.
    expect(diagnostico.mensaje).toMatch(/\d/);
    expect(diagnostico.sugerencia).toContain("pool");
    expect(diagnostico.sugerencia).toMatch(/\d/);
  });

  it("responde 403 a un costalero y no calcula ningún plan", async () => {
    dobles.getUser.mockResolvedValue({
      data: { user: { id: COSTALERO_ID } },
      error: null,
    });

    const respuesta = await POST(peticion(ENTRADA_VALIDA));

    expect(respuesta.status).toBe(403);
    const cuerpo = (await respuesta.json()) as { error: string };
    expect(cuerpo.error).toMatch(/permisos/i);
    expect(vi.mocked(solvePlanDeRelevos)).not.toHaveBeenCalled();
  });

  it("responde 403 a un capataz que no es el dueño de la cuadrilla del paso", async () => {
    dobles.getUser.mockResolvedValue({
      data: { user: { id: OTRO_CAPATAZ_ID } },
      error: null,
    });

    const respuesta = await POST(peticion(ENTRADA_VALIDA));

    expect(respuesta.status).toBe(403);
    expect(vi.mocked(solvePlanDeRelevos)).not.toHaveBeenCalled();
  });

  it("responde 403 si la RLS no deja leer la cuadrilla del paso", async () => {
    // La RLS de §10 no deja leer `cuadrillas` a quien no es su dueño: sin poder
    // comprobar la propiedad, no se calcula ningún plan.
    dobles.obtenerCuadrilla.mockResolvedValue({ data: null, error: null });

    const respuesta = await POST(peticion(ENTRADA_VALIDA));

    expect(respuesta.status).toBe(403);
    expect(vi.mocked(solvePlanDeRelevos)).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión y no consulta los repositorios", async () => {
    dobles.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const respuesta = await POST(peticion(ENTRADA_VALIDA));

    expect(respuesta.status).toBe(401);
    const cuerpo = (await respuesta.json()) as { error: string };
    expect(cuerpo.error).toMatch(/sesión/i);
    expect(dobles.obtenerPaso).not.toHaveBeenCalled();
    expect(vi.mocked(solvePlanDeRelevos)).not.toHaveBeenCalled();
  });

  it("responde 400 con un mensaje en español si el cuerpo no es un JSON válido", async () => {
    const respuesta = await POST(peticion("esto no es un json"));

    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { error: string };
    expect(cuerpo.error).toMatch(/[áéíóúñ]/i);
    expect(vi.mocked(solvePlanDeRelevos)).not.toHaveBeenCalled();
  });

  it("responde 400 con un mensaje en español si la forma del cuerpo no es válida", async () => {
    const respuesta = await POST(
      peticion({
        pasoId: PASO_ID,
        trabajaderas: [
          { id: "trabajadera-1", position: "uno", carga: 5, pool: [] },
        ],
        tramos: [],
        boquillas: [],
      }),
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { error: string };
    expect(cuerpo.error).toMatch(/[áéíóúñ]/i);
    expect(cuerpo.error).toContain("válid");
    expect(vi.mocked(solvePlanDeRelevos)).not.toHaveBeenCalled();
  });
});

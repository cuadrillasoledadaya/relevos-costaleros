/**
 * Tests de la API de planes (§12): `POST /api/planes` (crea y persiste) y
 * `GET /api/planes?pasoId=` (historial de versiones).
 *
 * Los dobles son de módulo: la sesión de Supabase y el servicio del plan se
 * sustituyen para poder comprobar el contrato HTTP (400, 401, 403 y 200)
 * sin base de datos. El servicio con la base de datos real tiene sus propios
 * tests en `src/server/plan/__tests__/servicio.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { dobles } = vi.hoisted(() => ({
  dobles: {
    getUser: vi.fn(),
    calcularYGuardar: vi.fn(),
    listarHistorial: vi.fn(),
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
  })),
}));

vi.mock("@/server/plan/servicio", () => ({
  crearServicioPlan: vi.fn(() => ({
    calcularYGuardar: dobles.calcularYGuardar,
    listarHistorial: dobles.listarHistorial,
    publicar: vi.fn(),
  })),
}));

import { GET, POST } from "../route";

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

/** Petición POST con el cuerpo dado (o un JSON inválido). */
function peticion(cuerpo: unknown, ruta = "https://relevos.test/api/planes") {
  return new Request(ruta, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

/** Petición GET con la consulta dada. */
function peticionGet(consulta: string) {
  return new Request(`https://relevos.test/api/planes${consulta}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  dobles.getUser.mockResolvedValue({
    data: { user: { id: CAPATAZ_ID } },
    error: null,
  });
});

describe("POST /api/planes", () => {
  it("rechaza un cuerpo que no es JSON válido", async () => {
    const respuesta = await POST(peticion("esto no es json"));

    expect(respuesta.status).toBe(400);
    expect(dobles.calcularYGuardar).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo sin un pasoId válido", async () => {
    const respuesta = await POST(peticion({ seed: 20250330 }));

    expect(respuesta.status).toBe(400);
    expect(dobles.calcularYGuardar).not.toHaveBeenCalled();
  });

  it("rechaza una semilla que no es un número entero", async () => {
    const respuesta = await POST(peticion({ pasoId: PASO_ID, seed: "mil" }));

    expect(respuesta.status).toBe(400);
    expect(dobles.calcularYGuardar).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión y no calcula nada", async () => {
    dobles.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const respuesta = await POST(peticion({ pasoId: PASO_ID }));

    expect(respuesta.status).toBe(401);
    expect(dobles.calcularYGuardar).not.toHaveBeenCalled();
  });

  it("responde 403 cuando la sesión no es el capataz dueño del paso", async () => {
    dobles.calcularYGuardar.mockResolvedValue({
      ok: false,
      tipo: "sin_permiso",
      error: "No tienes permisos para operar con los planes de este paso.",
    });

    const respuesta = await POST(peticion({ pasoId: PASO_ID }));

    expect(respuesta.status).toBe(403);
    const cuerpo = (await respuesta.json()) as { error: string };
    expect(cuerpo.error).toContain("permisos");
  });

  it("devuelve el plan guardado con su versión y sus estadísticas", async () => {
    dobles.calcularYGuardar.mockResolvedValue({
      ok: true,
      planId: PLAN_ID,
      version: 3,
      stats: STATS,
    });

    const respuesta = await POST(peticion({ pasoId: PASO_ID, seed: 20250331 }));

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      ok: boolean;
      planId: string;
      version: number;
      stats: unknown;
    };
    expect(cuerpo.ok).toBe(true);
    expect(cuerpo.planId).toBe(PLAN_ID);
    expect(cuerpo.version).toBe(3);
    expect(cuerpo.stats).toEqual(STATS);
    expect(dobles.calcularYGuardar).toHaveBeenCalledWith(
      { pasoId: PASO_ID, seed: 20250331 },
      CAPATAZ_ID,
    );
  });

  it("un plan imposible es un 200 con el diagnóstico, no un error", async () => {
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

    const respuesta = await POST(peticion({ pasoId: PASO_ID }));

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      ok: boolean;
      diagnostico: { codigo: string; cifras: Record<string, number> };
    };
    expect(cuerpo.ok).toBe(false);
    expect(cuerpo.diagnostico.codigo).toBe("SIN_SUPLENTES");
    expect(cuerpo.diagnostico.cifras.r).toBe(0);
  });
});

describe("GET /api/planes", () => {
  it("rechaza una consulta sin pasoId", async () => {
    const respuesta = await GET(peticionGet(""));

    expect(respuesta.status).toBe(400);
    expect(dobles.listarHistorial).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    dobles.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const respuesta = await GET(peticionGet(`?pasoId=${PASO_ID}`));

    expect(respuesta.status).toBe(401);
    expect(dobles.listarHistorial).not.toHaveBeenCalled();
  });

  it("responde 403 cuando la sesión no es el capataz dueño del paso", async () => {
    dobles.listarHistorial.mockResolvedValue({
      ok: false,
      tipo: "sin_permiso",
      error: "No tienes permisos para operar con los planes de este paso.",
    });

    const respuesta = await GET(peticionGet(`?pasoId=${PASO_ID}`));

    expect(respuesta.status).toBe(403);
  });

  it("devuelve el historial con la versión más reciente primero", async () => {
    dobles.listarHistorial.mockResolvedValue({
      ok: true,
      planes: [
        {
          id: PLAN_ID,
          version: 2,
          status: "publicado",
          seed: 20250330,
          created_at: "2025-04-01T10:00:00.000Z",
          stats: STATS,
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          version: 1,
          status: "borrador",
          seed: 20250330,
          created_at: "2025-03-30T10:00:00.000Z",
          stats: STATS,
        },
      ],
    });

    const respuesta = await GET(peticionGet(`?pasoId=${PASO_ID}`));

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as Array<{
      id: string;
      version: number;
      status: string;
    }>;
    expect(cuerpo.map((plan) => plan.version)).toEqual([2, 1]);
    expect(cuerpo[0]?.status).toBe("publicado");
    expect(dobles.listarHistorial).toHaveBeenCalledWith(PASO_ID, CAPATAZ_ID);
  });
});

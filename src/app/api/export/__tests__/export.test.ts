/**
 * Tests de los endpoints de exportación (§12): `GET /api/export/relevos.csv` y
 * `GET /api/export/plan-por-costalero.csv`.
 *
 * El servicio va de doble: aquí se comprueba el contrato HTTP (400, 401,
 * 403, 404 y 200), las cabeceras del archivo y el contenido del CSV. La
 * lectura del plan de verdad tiene sus tests en `src/server/hoja/__tests__`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { dobles } = vi.hoisted(() => ({
  dobles: {
    getUser: vi.fn(),
    leerPlanParaExportar: vi.fn(),
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

vi.mock("@/server/hoja/plan", () => ({
  leerPlanParaExportar: dobles.leerPlanParaExportar,
}));

import { GET as GET_RELEVOS } from "../relevos.csv/route";
import { GET as GET_DESCANSOS } from "../plan-por-costalero.csv/route";

const PLAN_ID = "33333333-3333-4333-8333-333333333333";
const CAPATAZ_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/** Petición GET con el `planId` dado. */
function peticion(planId?: string): Request {
  const url = planId
    ? `https://relevos.test/api/export/relevos.csv?planId=${planId}`
    : "https://relevos.test/api/export/relevos.csv";
  return new Request(url);
}

/** Datos que devuelve el servicio (los mismos para los dos endpoints). */
function datos() {
  return {
    paso: {
      id: "p1",
      nombre: "Paso de la Soledad",
      anio: 2025,
      cuadrilla: "C",
    },
    plan: {
      id: PLAN_ID,
      version: 1,
      status: "publicado" as const,
      seed: 20250330,
      created_at: "2025-04-01T10:00:00.000Z",
    },
    hojas: [],
    filas: [
      {
        tramo: "Salida",
        ordinal: 1,
        tipo: "salida" as const,
        costalero: "Ana Ruiz",
        estado: "en_paso" as const,
        puesto: "patero izquierdo",
        trabajadera: "Trabajadera 1",
      },
      {
        tramo: "Salida",
        ordinal: 1,
        tipo: "salida" as const,
        costalero: "Beto Solá",
        estado: "descanso" as const,
        puesto: "",
        trabajadera: "Trabajadera 1",
      },
    ],
    descansos: [{ costalero: "Beto Solá", descansaEn: "Salida", total: 1 }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dobles.getUser.mockResolvedValue({
    data: { user: { id: CAPATAZ_ID } },
    error: null,
  });
  dobles.leerPlanParaExportar.mockResolvedValue({ ok: true, datos: datos() });
});

describe("GET /api/export/relevos.csv", () => {
  it("rechaza una petición sin planId", async () => {
    const respuesta = await GET_RELEVOS(peticion());

    expect(respuesta.status).toBe(400);
    expect(dobles.leerPlanParaExportar).not.toHaveBeenCalled();
  });

  it("rechaza un planId que no es un identificador válido", async () => {
    const respuesta = await GET_RELEVOS(peticion("no-es-un-uuid"));

    expect(respuesta.status).toBe(400);
    expect(dobles.leerPlanParaExportar).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    dobles.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const respuesta = await GET_RELEVOS(peticion(PLAN_ID));

    expect(respuesta.status).toBe(401);
    expect(dobles.leerPlanParaExportar).not.toHaveBeenCalled();
  });

  it("responde 403 cuando la sesión no es el capataz dueño", async () => {
    dobles.leerPlanParaExportar.mockResolvedValue({
      ok: false,
      tipo: "sin_permiso",
      error: "No tienes permisos para exportar los planes de este paso.",
    });

    const respuesta = await GET_RELEVOS(peticion(PLAN_ID));

    expect(respuesta.status).toBe(403);
  });

  it("responde 404 cuando el plan no existe", async () => {
    dobles.leerPlanParaExportar.mockResolvedValue({
      ok: false,
      tipo: "no_encontrado",
      error: "El plan no existe.",
    });

    const respuesta = await GET_RELEVOS(peticion(PLAN_ID));

    expect(respuesta.status).toBe(404);
  });

  it("devuelve el CSV con BOM, separador «;» y nombre de archivo", async () => {
    const respuesta = await GET_RELEVOS(peticion(PLAN_ID));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    // El nombre va en ASCII y también en UTF-8 (RFC 5987), para que los
    // acentos no lleguen como «demostraciÃ³n».
    const disposicion = respuesta.headers.get("Content-Disposition") ?? "";
    expect(disposicion).toContain('filename="relevos-paso-de-la-soledad.csv"');
    expect(disposicion).toContain("filename*=UTF-8''");

    // El BOM va en los bytes: `Response.text()` lo quita al decodificar.
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const texto = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    const lineas = texto.split("\r\n").filter((linea) => linea.length > 0);
    expect(lineas[1]).toBe(
      "Salida;1;salida;Ana Ruiz;en_paso;patero izquierdo;Trabajadera 1",
    );
    expect(lineas[2]).toBe("Salida;1;salida;Beto Solá;descanso;;Trabajadera 1");
  });
});

describe("GET /api/export/plan-por-costalero.csv", () => {
  it("rechaza una petición sin planId", async () => {
    const respuesta = await GET_DESCANSOS(
      new Request("https://relevos.test/api/export/plan-por-costalero.csv"),
    );

    expect(respuesta.status).toBe(400);
  });

  it("devuelve una fila por costalero", async () => {
    const respuesta = await GET_DESCANSOS(
      new Request(
        `https://relevos.test/api/export/plan-por-costalero.csv?planId=${PLAN_ID}`,
      ),
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    const texto = await respuesta.text();
    const lineas = texto.split("\r\n").filter((linea) => linea.length > 0);
    expect(lineas[1]).toBe("Beto Solá;Salida;1");
  });

  it("responde 401 sin sesión", async () => {
    dobles.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const respuesta = await GET_DESCANSOS(
      new Request(
        `https://relevos.test/api/export/plan-por-costalero.csv?planId=${PLAN_ID}`,
      ),
    );

    expect(respuesta.status).toBe(401);
  });
});

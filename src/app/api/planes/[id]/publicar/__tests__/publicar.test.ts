/**
 * Tests de `POST /api/planes/[id]/publicar` (§12): publicar un plan de
 * relevos para que lo vean los costaleros.
 *
 * El servicio del plan va de doble: aquí se comprueba el contrato HTTP
 * (401, 403, 404 y 200), no la publicación en la base de datos, que tiene sus
 * propios tests en `src/server/plan/__tests__/servicio.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { dobles } = vi.hoisted(() => ({
  dobles: {
    getUser: vi.fn(),
    publicar: vi.fn(),
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
    calcularYGuardar: vi.fn(),
    listarHistorial: vi.fn(),
    publicar: dobles.publicar,
  })),
}));

import { POST } from "../route";

const PLAN_ID = "33333333-3333-4333-8333-333333333333";
const CAPATAZ_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/** Petición POST contra la ruta de publicación. */
function peticion(): Request {
  return new Request(`https://relevos.test/api/planes/${PLAN_ID}/publicar`, {
    method: "POST",
  });
}

/** Contexto de la ruta con el id del plan. */
function contexto() {
  return { params: Promise.resolve({ id: PLAN_ID }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  dobles.getUser.mockResolvedValue({
    data: { user: { id: CAPATAZ_ID } },
    error: null,
  });
});

describe("POST /api/planes/[id]/publicar", () => {
  it("responde 401 sin sesión y no publica nada", async () => {
    dobles.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const respuesta = await POST(peticion(), contexto());

    expect(respuesta.status).toBe(401);
    expect(dobles.publicar).not.toHaveBeenCalled();
  });

  it("responde 403 cuando la sesión no es el capataz dueño del paso", async () => {
    dobles.publicar.mockResolvedValue({
      ok: false,
      tipo: "sin_permiso",
      error: "No tienes permisos para operar con los planes de este paso.",
    });

    const respuesta = await POST(peticion(), contexto());

    expect(respuesta.status).toBe(403);
  });

  it("responde 404 cuando el plan no existe", async () => {
    dobles.publicar.mockResolvedValue({
      ok: false,
      tipo: "no_encontrado",
      error: "El plan no existe.",
    });

    const respuesta = await POST(peticion(), contexto());

    expect(respuesta.status).toBe(404);
    const cuerpo = (await respuesta.json()) as { error: string };
    expect(cuerpo.error).toBe("El plan no existe.");
  });

  it("publica el plan y lo confirma", async () => {
    dobles.publicar.mockResolvedValue({ ok: true });

    const respuesta = await POST(peticion(), contexto());

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as { ok: boolean };
    expect(cuerpo.ok).toBe(true);
    expect(dobles.publicar).toHaveBeenCalledWith(PLAN_ID, CAPATAZ_ID);
  });
});

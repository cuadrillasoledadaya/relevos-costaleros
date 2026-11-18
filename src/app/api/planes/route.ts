/**
 * API de los planes de relevos (§12): `POST /api/planes` crea y persiste un
 * plan nuevo, `GET /api/planes?pasoId=` devuelve el historial de versiones.
 *
 * - El cuerpo de `POST` es `{ pasoId, seed? }` (§12). El plan **se calcula en
 *   el servidor** con lo que hay guardado del paso: el navegador no manda el
 *   reparto, solo el paso y, si quiere, la semilla.
 * - Un plan imposible **no es un error**: es un 200 con `ok: false` y el
 *   diagnóstico con sus cifras y su sugerencia (§11.4), igual que en
 *   `POST /api/solve`.
 * - Un plan que no pasa `verificarPlan` (R1 a R4) **no se persiste** (S-5).
 * - Solo el capataz dueño de la cuadrilla del paso: 401 sin sesión, 403 sin
 *   permiso. Un paso que la RLS de §10 no deja leer responde 403, para no
 *   filtrar su existencia.
 */

import { NextResponse } from "next/server";

import { numero, texto } from "@/lib/schemas";
import { crearServicioPlan } from "@/server/plan/servicio";
import { createServerSupabaseClient } from "@/server/supabase/server";

/** El solver es CPU-bound: los endpoints corren en Node (§12 y §13.3). */
export const runtime = "nodejs";

/** Validador del paso: un UUID. */
const pasoIdSchema = texto({ uuid: true });

/** Validador de la semilla: un entero. */
const seedSchema = numero({ integer: true });

/**
 * Crea y persiste el plan de relevos del paso indicado.
 *
 * - 400: el cuerpo no es un JSON válido, o el `pasoId` no es un UUID, o la
 *   semilla no es un entero.
 * - 401: la petición no tiene sesión.
 * - 403: la sesión no es el capataz dueño de la cuadrilla del paso.
 * - 200: `{ ok: true, planId, version, stats }` con el plan guardado, o
 *   `{ ok: false, diagnostico }` si el plan es imposible.
 */
export async function POST(request: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return errorJson("El cuerpo de la petición no es un JSON válido.", 400);
  }

  const datos = cuerpo as Record<string, unknown>;
  const pasoId = pasoIdSchema.safeParse(datos.pasoId);
  if (!pasoId.success) {
    return errorJson(
      "Los datos del plan no son válidos: falta el pasoId o no es un identificador válido.",
      400,
    );
  }
  // La semilla es opcional: si no viene, el solver usa la de por defecto
  // (SEMILLA_POR_DEFECTO).
  let seed: number | undefined;
  if (datos.seed !== undefined && datos.seed !== null) {
    const semilla = seedSchema.safeParse(datos.seed);
    if (!semilla.success) {
      return errorJson(
        "Los datos del plan no son válidos: la semilla debe ser un número entero.",
        400,
      );
    }
    seed = semilla.data;
  }

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return errorJson("No hay ninguna sesión iniciada.", 401);
  }

  const servicio = crearServicioPlan(cliente);
  const resultado = await servicio.calcularYGuardar(
    { pasoId: pasoId.data, seed },
    user.id,
  );

  if (resultado.ok) {
    return NextResponse.json(
      {
        ok: true,
        planId: resultado.planId,
        version: resultado.version,
        stats: resultado.stats,
      },
      { status: 200 },
    );
  }
  if (resultado.tipo === "infeasible") {
    // Un plan imposible no es un error: es el diagnóstico con sus números.
    return NextResponse.json(
      { ok: false, diagnostico: resultado.diagnostico },
      { status: 200 },
    );
  }
  if (resultado.tipo === "sin_permiso") {
    return errorJson(resultado.error, 403);
  }
  return errorJson(resultado.error, 500);
}

/**
 * Historial de versiones del plan de un paso: la más reciente primero.
 *
 * - 400: falta el `pasoId` o no es un UUID.
 * - 401: la petición no tiene sesión.
 * - 403: la sesión no es el capataz dueño de la cuadrilla del paso.
 * - 200: un array con `{ id, version, status, seed, created_at, stats }` por
 *   versión.
 */
export async function GET(request: Request): Promise<Response> {
  const pasoId = pasoIdSchema.safeParse(
    new URL(request.url).searchParams.get("pasoId"),
  );
  if (!pasoId.success) {
    return errorJson(
      "Falta el pasoId del historial o no es un identificador válido.",
      400,
    );
  }

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return errorJson("No hay ninguna sesión iniciada.", 401);
  }

  const servicio = crearServicioPlan(cliente);
  const resultado = await servicio.listarHistorial(pasoId.data, user.id);

  if (resultado.ok) {
    return NextResponse.json(resultado.planes, { status: 200 });
  }
  if (resultado.tipo === "sin_permiso") {
    return errorJson(resultado.error, 403);
  }
  return errorJson(resultado.error, 500);
}

/** Respuesta de error: siempre un mensaje en español. */
function errorJson(mensaje: string, status: number): NextResponse {
  return NextResponse.json({ error: mensaje }, { status });
}

/**
 * `POST /api/solve` (§12): calcula el plan de relevos de un paso.
 *
 * El endpoint **no persiste nada**: solo calcula. Persistir `planes` y `relevos` es
 * trabajo de otro endpoint (§12).
 *
 * - El cuerpo es un `RelevoPlanInput` (§11.1) y la respuesta es un `RelevoPlanResult`:
 *   `ok: true` con el plan y sus estadísticas, o `ok: false` con el diagnóstico de
 *   infactibilidad (§11.4). Un plan imposible **no es un error**: es un 200 con
 *   `ok: false` y el diagnóstico con sus cifras y su sugerencia.
 * - El solver es un contrato de `src/domain/**` (W2): se consume tal cual. No se
 *   reimplementa, no se cambian sus firmas y aquí corre en el servidor (§13.3).
 * - Solo calcula el capataz **dueño de la cuadrilla** del paso (§12): la RLS de §10 ya
 *   limita lo que la sesión puede leer, y aquí se comprueba además que el dueño sea el
 *   capataz de la sesión. Un costalero (o un capataz ajeno) recibe 403 y ningún plan
 *   parcial.
 */

import { NextResponse } from "next/server";

import type { RelevoPlanInput } from "@/domain/modelo";
import { solvePlanDeRelevos } from "@/domain/solver";
import {
  array,
  conValorPorDefecto,
  enumeracion,
  numero,
  objeto,
  opcional,
  texto,
  type Schema,
  type SchemaError,
  type SchemaIssue,
} from "@/lib/schemas";
import { crearRepositorioCuadrillas } from "@/server/repos/cuadrillas";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { createServerSupabaseClient } from "@/server/supabase/server";
import type { SupabaseClientLike } from "@/server/supabase/types";

/** El solver es CPU-bound: el endpoint corre en Node (§12 y §13.3). */
export const runtime = "nodejs";

/**
 * Campos del cuerpo de la petición: el `RelevoPlanInput` de §11.1, validados con los
 * validadores del proyecto (`src/lib/schemas.ts`).
 */
const CAMPOS_ENTRADA = {
  pasoId: texto({ min: 1 }),
  trabajaderas: array(
    objeto({
      id: texto({ min: 1 }),
      position: numero({ integer: true, min: 1 }),
      carga: conValorPorDefecto(numero({ integer: true, min: 1, max: 5 }), 5),
      pool: array(texto({ min: 1 })),
    }),
  ),
  tramos: array(
    objeto({
      id: texto({ min: 1 }),
      name: texto({ min: 1 }),
      ordinal: numero({ integer: true, min: 1 }),
      kind: enumeracion(["salida", "normal", "entrada"]),
    }),
  ),
  boquillas: array(texto({ min: 1 })),
  opciones: opcional(
    objeto({
      seed: opcional(numero({ integer: true })),
      maxIteraciones: opcional(numero({ integer: true, min: 1 })),
    }),
  ),
};

/** El cuerpo entero, validado de una vez. */
const planInputSchema = objeto(CAMPOS_ENTRADA);

/**
 * Calcula el plan de relevos del paso indicado.
 *
 * - 400: el cuerpo no es un JSON válido o no tiene la forma de un `RelevoPlanInput`.
 * - 401: la petición no tiene sesión.
 * - 403: la sesión no es el capataz dueño de la cuadrilla del paso.
 * - 200: el resultado del solver (`ok: true` con el plan, o `ok: false` con el
 *   diagnóstico de infactibilidad).
 */
export async function POST(request: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return errorJson("El cuerpo de la petición no es un JSON válido.", 400);
  }

  const validacion = planInputSchema.safeParse(cuerpo);
  if (!validacion.success) {
    return errorJson(
      `Los datos del plan no son válidos: ${detalleDeValidacion(cuerpo, validacion.error)}`,
      400,
    );
  }
  const entrada: RelevoPlanInput = validacion.data;

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return errorJson("No hay ninguna sesión iniciada.", 401);
  }

  if (!(await esCapatazDelPaso(cliente, entrada.pasoId, user.id))) {
    return errorJson(
      "No tienes permisos para calcular el plan de este paso.",
      403,
    );
  }

  // El solver decide: si el plan es imposible, lo dice con números (§11.4).
  const resultado = solvePlanDeRelevos(entrada);
  return NextResponse.json(resultado, { status: 200 });
}

/**
 * `true` si el usuario de la sesión es el capataz dueño de la cuadrilla del paso.
 *
 * Si el paso no se puede leer (no existe o la RLS de §10 no lo deja ver) el resultado
 * es `false`: sin poder comprobar la propiedad no se calcula ningún plan.
 */
async function esCapatazDelPaso(
  cliente: SupabaseClientLike,
  pasoId: string,
  usuarioId: string,
): Promise<boolean> {
  const pasos = crearRepositorioPasos(cliente);
  const paso = await pasos.obtenerPorId(pasoId);
  if (!paso.data) return false;

  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const cuadrilla = await cuadrillas.obtenerPorId(paso.data.cuadrilla_id);
  return cuadrilla.data?.owner_id === usuarioId;
}

/** Respuesta de error: siempre un mensaje en español. */
function errorJson(mensaje: string, status: number): NextResponse {
  return NextResponse.json({ error: mensaje }, { status });
}

/**
 * Detalle de los problemas del cuerpo, campo a campo, para que se sepa qué arreglar.
 *
 * `objeto` no pone el nombre del campo en la ruta del problema, así que cada campo se
 * revisa aparte con su propio validador.
 */
function detalleDeValidacion(cuerpo: unknown, error: SchemaError): string {
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    return `el cuerpo de la petición debe ser un objeto con los datos del plan (${error.issues.map((issue) => issue.message).join("; ")})`;
  }

  const entrada = cuerpo as Record<string, unknown>;
  const campos: Array<[string, Schema<unknown>]> =
    Object.entries(CAMPOS_ENTRADA);
  const problemas: string[] = [];

  for (const [campo, schema] of campos) {
    const resultado = schema.safeParse(entrada[campo]);
    if (resultado.success) continue;
    for (const issue of resultado.error.issues) {
      problemas.push(`${campo}${rutaDe(issue)}: ${issue.message}`);
    }
  }

  if (problemas.length === 0) {
    return error.issues.map((issue) => issue.message).join("; ");
  }
  return problemas.join("; ");
}

/** Ruta de un problema dentro de un campo: `trabajaderas[0].position`. */
function rutaDe(issue: SchemaIssue): string {
  if (issue.path.length === 0) return "";
  const ruta = issue.path
    .map((parte) => (typeof parte === "number" ? `[${String(parte)}]` : parte))
    .join(".");
  return ruta.startsWith("[") ? ruta : `.${ruta}`;
}

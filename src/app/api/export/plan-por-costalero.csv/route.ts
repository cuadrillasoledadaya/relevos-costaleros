/**
 * `GET /api/export/plan-por-costalero.csv` (§12): el plan de relevos en CSV,
 * una fila por costalero con los tramos en los que descansa y su total de
 * descansos.
 *
 * Es el archivo para repasar la equidad del reparto: quién descansa más y
 * quién menos.
 */

import { cabecerasDeArchivo, csvDeDescansos } from "@/lib/export/csv";
import { leerPlanParaExportar } from "@/server/hoja/plan";
import { createServerSupabaseClient } from "@/server/supabase/server";

export const runtime = "nodejs";

/** Valida el `planId` de la consulta. */
const PLAN_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exporta el plan por costalero.
 *
 * - 400: falta el `planId` o no es un identificador válido.
 * - 401: la petición no tiene sesión.
 * - 403: la sesión no es el capataz dueño de la cuadrilla del paso.
 * - 404: el plan no existe.
 * - 200: el CSV.
 */
export async function GET(request: Request): Promise<Response> {
  const planId = new URL(request.url).searchParams.get("planId");
  if (!planId || !PLAN_ID.test(planId)) {
    return errorJson(
      "Falta el planId del plan o no es un identificador válido.",
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

  const resultado = await leerPlanParaExportar(cliente, planId, user.id);
  if (!resultado.ok) {
    if (resultado.tipo === "no_encontrado") {
      return errorJson(resultado.error, 404);
    }
    if (resultado.tipo === "sin_permiso") {
      return errorJson(resultado.error, 403);
    }
    return errorJson(resultado.error, 500);
  }

  const csv = csvDeDescansos(resultado.datos.descansos);
  const nombre = `plan-por-costalero-${resultado.datos.paso.nombre}.csv`;
  return new Response(csv, {
    status: 200,
    headers: cabecerasDeArchivo(nombre),
  });
}

/** Respuesta de error: siempre un mensaje en español. */
function errorJson(mensaje: string, status: number): Response {
  return Response.json({ error: mensaje }, { status });
}

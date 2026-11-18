/**
 * `POST /api/planes/[id]/publicar` (§12): publica un plan de relevos para que
 * lo vean los costaleros.
 *
 * El cambio de estado es atómico y lo hace la base de datos
 * (`publicar_plan`): el plan pasa a `publicado` y los demás planes del mismo
 * paso vuelven a `borrador`, de modo que un paso tiene un solo plan publicado.
 *
 * - 401: la petición no tiene sesión.
 * - 403: la sesión no es el capataz dueño de la cuadrilla del paso del plan.
 * - 404: el plan no existe o no se puede ver.
 * - 200: `{ ok: true }`.
 */

import { NextResponse } from "next/server";

import { crearServicioPlan } from "@/server/plan/servicio";
import { createServerSupabaseClient } from "@/server/supabase/server";

export const runtime = "nodejs";

/**
 * Publica el plan indicado.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return errorJson("No hay ninguna sesión iniciada.", 401);
  }

  const { id } = await params;
  const servicio = crearServicioPlan(cliente);
  const resultado = await servicio.publicar(id, user.id);

  if (resultado.ok) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (resultado.tipo === "sin_permiso") {
    return errorJson(resultado.error, 403);
  }
  if (resultado.tipo === "no_encontrado") {
    return errorJson(resultado.error, 404);
  }
  return errorJson(resultado.error, 500);
}

/** Respuesta de error: siempre un mensaje en español. */
function errorJson(mensaje: string, status: number): NextResponse {
  return NextResponse.json({ error: mensaje }, { status });
}

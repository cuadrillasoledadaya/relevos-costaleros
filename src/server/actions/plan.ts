"use server";

/**
 * Server actions del plan de relevos (P5, §9).
 *
 * El capataz calcula el plan desde el móvil y publica el que quiere. Las
 * acciones son la autoridad: validan la entrada, comprueban la sesión y
 * devuelven el resultado con un mensaje en español.
 *
 * La lógica vive en `src/server/plan/**`, el mismo módulo que usan los
 * endpoints de §12: la pantalla y el HTTP no pueden divergir.
 */

import { revalidatePath } from "next/cache";

import type { DiagnosticoInfeasibilidad, PlanStats } from "@/domain/modelo";
import {
  array,
  numero,
  objeto,
  opcional,
  texto,
  type SchemaError,
} from "@/lib/schemas";
import { crearServicioPlan, type ServicioPlan } from "@/server/plan/servicio";
import { createServerSupabaseClient } from "@/server/supabase/server";

/** Resultado de una mutación: mensaje para la UI o error en español. */
export type ResultadoAccionPlan<T = undefined> =
  | { ok: true; mensaje: string; datos: T }
  | {
      ok: false;
      error: string;
      /** Diagnóstico de infactibilidad (§11.4), si el plan no se pudo calcular. */
      diagnostico?: DiagnosticoInfeasibilidad;
    };

/** Lo que devuelve `calcularPlan` cuando el plan se ha guardado. */
export type DatosPlanCreado = {
  planId: string;
  version: number;
  stats: PlanStats;
};

/** Lo que las acciones necesitan para trabajar. */
export type DependenciasPlan = {
  /** Id del usuario de la sesión; `null` si no hay sesión. */
  usuarioId: string | null;
  /** Servicio del plan de relevos. */
  servicio: ServicioPlan;
};

/* -------------------------------------------------------------------------- */
/* Validación                                                                  */
/* -------------------------------------------------------------------------- */

const calcularPlanSchema = objeto({
  pasoId: texto({ uuid: true }),
  seed: opcional(numero({ integer: true })),
  semillas: opcional(array(numero({ integer: true }))),
});

const publicarPlanSchema = objeto({
  planId: texto({ uuid: true }),
});

/** Une los mensajes de validación de los schemas del proyecto. */
function mensajeDeValidacion(error: SchemaError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

/* -------------------------------------------------------------------------- */
/* Utilidades internas                                                          */
/* -------------------------------------------------------------------------- */

/** Las dependencias reales: la sesión de quien llama y el servicio del plan. */
async function obtenerDependencias(): Promise<DependenciasPlan> {
  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  return {
    usuarioId: user?.id ?? null,
    servicio: crearServicioPlan(cliente),
  };
}

/** Revalida la pantalla del plan; fuera de una petición (tests) no hace nada. */
function revalidarPantallaPlan(): void {
  try {
    revalidatePath("/cuadrillas/[cuadrillaId]/paso/[pasoId]/plan", "page");
  } catch {
    // `revalidatePath` sólo tiene efecto dentro de una petición de Next.js.
  }
}

/* -------------------------------------------------------------------------- */
/* Acciones                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Calcula el plan de relevos del paso y lo guarda como versión nueva.
 *
 * El plan lo calcula el solver en el servidor (el navegador no manda el
 * reparto) y **no se guarda** si no pasa la verificación de R1 a R4. Un plan
 * imposible no es un error de la acción: vuelve el diagnóstico con sus cifras
 * y su sugerencia (§11.4) para que la pantalla lo muestre.
 */
export async function calcularPlan(
  entrada: { pasoId: string; seed?: number; semillas?: number[] },
  dependencias?: Partial<DependenciasPlan>,
): Promise<ResultadoAccionPlan<DatosPlanCreado>> {
  const validacion = calcularPlanSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }

  const resueltas = dependencias ?? (await obtenerDependencias());
  if (!resueltas.usuarioId || !resueltas.servicio) {
    return { ok: false, error: "No hay ninguna sesión iniciada." };
  }

  const resultado = await resueltas.servicio.calcularYGuardar(
    {
      pasoId: validacion.data.pasoId,
      seed: validacion.data.seed,
      semillas: validacion.data.semillas,
    },
    resueltas.usuarioId,
  );

  if (resultado.ok) {
    revalidarPantallaPlan();
    return {
      ok: true,
      mensaje: `Plan de relevos guardado como versión ${String(resultado.version)}.`,
      datos: {
        planId: resultado.planId,
        version: resultado.version,
        stats: resultado.stats,
      },
    };
  }
  if (resultado.tipo === "infeasible") {
    return {
      ok: false,
      error: resultado.diagnostico.mensaje,
      diagnostico: resultado.diagnostico,
    };
  }
  return { ok: false, error: resultado.error };
}

/**
 * Publica un plan de relevos para que lo vean los costaleros.
 *
 * La publicación es atómica y la hace la base de datos: el plan pasa a
 * `publicado` y los demás planes del mismo paso vuelven a `borrador`.
 */
export async function publicarPlan(
  entrada: { planId: string },
  dependencias?: Partial<DependenciasPlan>,
): Promise<ResultadoAccionPlan<{ planId: string }>> {
  const validacion = publicarPlanSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }

  const resueltas = dependencias ?? (await obtenerDependencias());
  if (!resueltas.usuarioId || !resueltas.servicio) {
    return { ok: false, error: "No hay ninguna sesión iniciada." };
  }

  const resultado = await resueltas.servicio.publicar(
    validacion.data.planId,
    resueltas.usuarioId,
  );

  if (resultado.ok) {
    revalidarPantallaPlan();
    return {
      ok: true,
      mensaje: "Plan publicado: los costaleros ya lo ven.",
      datos: { planId: validacion.data.planId },
    };
  }
  return { ok: false, error: resultado.error };
}

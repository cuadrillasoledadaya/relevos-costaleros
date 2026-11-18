/**
 * Lectura de un plan de relevos guardado en la base de datos.
 *
 * El plan se **vuelve a construir** con las filas de `relevos` y se **vuelve
 * a verificar** con `verificarPlan` (S-5): la pantalla nunca muestra un plan
 * que no lo pase. Si el plan ya no encaja con la configuración actual del
 * paso (alguien cambió el pool o los tramos), la lectura lo dice en vez de
 * presentarlo como si fuera válido.
 */

import type {
  EstadoCostoalero,
  PlanStats,
  RelevoPlan,
  RelevoPlanInput,
} from "@/domain/modelo";
import { verificarPlan } from "@/domain/solver";
import { crearRepositorioPlanes, type Plan } from "@/server/repos/planes";
import { crearRepositorioRelevos, type Relevo } from "@/server/repos/relevos";
import type { SupabaseClientLike } from "@/server/supabase/types";

import { construirEntradaDelPlan } from "./entrada";

/** Un plan guardado, leído de la base de datos y verificado. */
export type PlanLeido = {
  /** El plan tal y como quedó guardado. */
  plan: RelevoPlan;
  /** Las estadísticas recalculadas sobre el plan leído. */
  stats: PlanStats;
  version: number;
  status: "borrador" | "publicado";
  seed: number;
  created_at: string;
};

/** Resultado de leer un plan de la base de datos. */
export type ResultadoLecturaPlan =
  | { ok: true; cumple: boolean; leido: PlanLeido }
  | { ok: false; error: string };

/**
 * Lee un plan de la base de datos, lo reconstruye y lo verifica.
 *
 * `cumple` es `true` cuando el plan leído pasa R1 a R4 con la configuración
 * **actual** del paso.
 */
export async function leerPlanDeLaBase(
  cliente: SupabaseClientLike,
  planId: string,
): Promise<ResultadoLecturaPlan> {
  const planes = crearRepositorioPlanes(cliente);
  const fila = await planes.obtenerPorId(planId);
  if (fila.error) return { ok: false, error: fila.error.message };
  if (!fila.data) return { ok: false, error: "El plan no existe." };

  const relevos = await crearRepositorioRelevos(cliente).listarPorPlan(planId);
  if (relevos.error) return { ok: false, error: relevos.error.message };

  const entrada = await construirEntradaDelPlan(cliente, fila.data.paso_id);
  if (!entrada.ok) return { ok: false, error: entrada.error };

  const plan = reconstruirPlanDesdeRelevos(
    fila.data,
    relevos.data,
    entrada.entrada,
  );
  const stats = verificarPlan(plan, entrada.entrada);
  const cumple =
    stats.cumplimiento.r1 &&
    stats.cumplimiento.r2 &&
    stats.cumplimiento.r3 &&
    stats.cumplimiento.r4;

  return {
    ok: true,
    cumple,
    leido: {
      plan,
      stats,
      version: fila.data.version,
      status: fila.data.status,
      seed: fila.data.seed,
      created_at: fila.data.created_at,
    },
  };
}

/**
 * Reconstruye el plan con las filas de `relevos` que hay guardadas.
 *
 * Los estados salen de las filas y el reparto por trabajadera se vuelve a
 * componer con los pools de la entrada: el plan que se lee de la base es el
 * que se muestra, no el que quedó en memoria al calcularlo.
 */
export function reconstruirPlanDesdeRelevos(
  plan: Plan,
  relevos: Relevo[],
  entrada: RelevoPlanInput,
): RelevoPlan {
  const estados: Record<string, Record<string, EstadoCostoalero>> = {};
  for (const tramo of entrada.tramos) {
    estados[tramo.id] = {};
  }
  for (const relevo of relevos) {
    const delTramo = estados[relevo.tramo_id];
    if (!delTramo) continue;
    delTramo[relevo.costalero_id] = relevo.estado;
  }

  const porTrabajadera: RelevoPlan["porTrabajadera"] = {};
  for (const tramo of entrada.tramos) {
    const porLinea: Record<string, { enPaso: string[]; descansan: string[] }> =
      {};
    for (const trabajadera of entrada.trabajaderas) {
      const enPaso: string[] = [];
      const descansan: string[] = [];
      for (const costalero of trabajadera.pool) {
        const estado = estados[tramo.id]?.[costalero];
        if (estado === "descanso") descansan.push(costalero);
        if (estado === "en_paso") enPaso.push(costalero);
      }
      porLinea[trabajadera.id] = { enPaso, descansan };
    }
    porTrabajadera[tramo.id] = porLinea;
  }

  return {
    pasoId: plan.paso_id,
    seed: plan.seed,
    solverVersion: plan.solver_version,
    estados,
    porTrabajadera,
  };
}

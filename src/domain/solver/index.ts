/**
 * API del solver (§11.1).
 *
 * `solvePlanDeRelevos` devuelve siempre un plan que cumple R1..R4 o un diagnóstico con
 * números: nunca un plan inválido (requisito S-3, X-10).
 */

import { calcularEstadisticas } from "../reglas";
import type {
  EstadoCostoalero,
  PlanStats,
  RelevoPlan,
  RelevoPlanInput,
  RelevoPlanResult,
  SolverOpciones,
} from "../modelo";
import { buscarPlan, crearContexto } from "./busqueda";
import { diagnosticoGenerico } from "./diagnostico";
import { optimizar } from "./optimizador";
import type { RepartoIndices } from "./optimizador";
import { crearPRNG } from "./prng";
import { evaluarFactibilidad } from "../factibilidad";

export {
  evaluarFactibilidad,
  tramosNecesarios,
  tramosNecesariosDePool,
} from "../factibilidad";

/** Versión del solver; se guarda en `planes.solver_version` (§10). */
export const SOLVER_VERSION = "1.0.0";

/** Semilla por defecto del solver (§11.1). */
export const SEMILLA_POR_DEFECTO = 20250330;

/** Presupuesto de iteraciones de la fase de optimización por defecto (§11.1). */
export const ITERACIONES_POR_DEFECTO = 200000;

/**
 * Construye el plan público a partir del reparto interno de descansos.
 * El orden de las listas es determinista (orden del pool), de modo que el mismo input con
 * la misma semilla produce byte a byte el mismo JSON.
 */
function construirPlan(
  contexto: ReturnType<typeof crearContexto>,
  reparto: RepartoIndices,
  seed: number,
): RelevoPlan {
  const estados: Record<string, Record<string, EstadoCostoalero>> = {};
  const porTrabajadera: Record<
    string,
    Record<string, { enPaso: string[]; descansan: string[] }>
  > = {};

  for (let indiceTramo = 0; indiceTramo < contexto.totalTramos; indiceTramo++) {
    const tramo = contexto.tramos[indiceTramo];
    if (!tramo) continue;

    const estadosTramo: Record<string, EstadoCostoalero> = {};
    const porTramo: Record<string, { enPaso: string[]; descansan: string[] }> =
      {};

    for (let indice = 0; indice < contexto.trabajaderas.length; indice++) {
      const descansantes = new Set(reparto[indice]?.[indiceTramo] ?? []);
      const enPaso: string[] = [];
      const descansan: string[] = [];
      for (const indicePersona of contexto.poolPorTrabajadera[indice] ?? []) {
        const costalero = contexto.personas[indicePersona];
        if (costalero === undefined) continue;
        if (descansantes.has(indicePersona)) {
          descansan.push(costalero);
          estadosTramo[costalero] = "descanso";
        } else {
          enPaso.push(costalero);
          estadosTramo[costalero] = "en_paso";
        }
      }
      const id = contexto.trabajaderas[indice]?.id;
      if (id !== undefined) porTramo[id] = { enPaso, descansan };
    }

    estados[tramo.id] = estadosTramo;
    porTrabajadera[tramo.id] = porTramo;
  }

  return {
    pasoId: contexto.pasoId,
    seed,
    solverVersion: SOLVER_VERSION,
    estados,
    porTrabajadera,
  };
}

/**
 * Calcula el plan de relevos de un paso.
 *
 * Primero comprueba las precondiciones F-1..F-6 (§7.4): si alguna falla devuelve
 * `ok: false` con el diagnóstico y los números. Si son factibles, ejecuta la fase A
 * (satisfacción de R1..R4) y la fase B (equidad, §8.2), y verifica el plan resultante
 * antes de devolverlo (S-5).
 */
export function solvePlanDeRelevos(
  input: RelevoPlanInput,
  opciones?: SolverOpciones,
): RelevoPlanResult {
  const seed = opciones?.seed ?? input.opciones?.seed ?? SEMILLA_POR_DEFECTO;
  const maxIteraciones =
    opciones?.maxIteraciones ??
    input.opciones?.maxIteraciones ??
    ITERACIONES_POR_DEFECTO;

  const factibilidad = evaluarFactibilidad(input);
  if (!factibilidad.factible) {
    return {
      ok: false,
      diagnostico:
        factibilidad.diagnostico ??
        diagnosticoGenerico(
          "El paso no cumple las precondiciones de factibilidad",
          { T: input.tramos.length, trabajaderas: input.trabajaderas.length },
          "revisar el reparto de costaleros por trabajadera y el número de tramos",
        ),
    };
  }

  const contexto = crearContexto(input);
  const prng = crearPRNG(seed);

  const busqueda = buscarPlan(contexto, prng);
  if (!busqueda.ok) {
    return {
      ok: false,
      diagnostico: diagnosticoGenerico(
        busqueda.agotado
          ? "No se ha encontrado un plan válido dentro del presupuesto de búsqueda"
          : "No se ha encontrado un plan válido para este reparto de costaleros",
        {
          T: contexto.totalTramos,
          trabajaderas: contexto.trabajaderas.length,
          costaleros: contexto.personas.length,
        },
        "revisar el reparto de costaleros por trabajadera y el número de tramos",
      ),
    };
  }

  const optimizada = optimizar(
    contexto,
    busqueda.reparto,
    prng,
    maxIteraciones,
  );
  const plan = construirPlan(contexto, optimizada.descansoPorTrabajadera, seed);
  const stats = calcularEstadisticas(plan, input);

  if (
    !stats.cumplimiento.r1 ||
    !stats.cumplimiento.r2 ||
    !stats.cumplimiento.r3 ||
    !stats.cumplimiento.r4
  ) {
    return {
      ok: false,
      diagnostico: diagnosticoGenerico(
        "El plan calculado no supera la verificación de R1 a R4",
        {
          T: contexto.totalTramos,
          trabajaderas: contexto.trabajaderas.length,
          costaleros: contexto.personas.length,
        },
        "revisar la configuración del paso y recalcular el plan",
      ),
    };
  }

  return { ok: true, plan, stats };
}

/**
 * Verificación independiente del plan: re-evalúa R1..R4 (y mide R5) sobre el plan
 * producido (S-5, X-10). La app nunca muestra un plan que no lo pase.
 */
export function verificarPlan(
  plan: RelevoPlan,
  input: RelevoPlanInput,
): PlanStats {
  return calcularEstadisticas(plan, input);
}

/**
 * Servicio del plan de relevos: calcular, persistir, listar el historial y
 * publicar.
 *
 * Aquí vive el servicio de §12 (`POST /api/planes`, `GET /api/planes`,
 * `POST /api/planes/[id]/publicar`) y también lo que usan las server actions
 * de `src/server/actions/plan.ts`: una sola implementación para el HTTP y para
 * la pantalla, sin duplicar la lógica.
 *
 * Reglas que respeta:
 * - El solver es un contrato de `src/domain/**` (W2): se consume tal cual.
 * - Un plan **no se persiste** si no pasa `verificarPlan` (S-5, §11.3).
 * - Un plan imposible no es un error: es un diagnóstico con cifras (§11.4).
 * - Solo el capataz dueño de la cuadrilla del paso opera con sus planes.
 */

import type {
  DiagnosticoInfeasibilidad,
  PlanStats,
  RelevoPlan,
} from "@/domain/modelo";
import {
  SEMILLA_POR_DEFECTO,
  solvePlanDeRelevos,
  verificarPlan,
} from "@/domain/solver";
import { diagnosticoGenerico } from "@/domain/solver/diagnostico";
import { crearRepositorioPlanes } from "@/server/repos/planes";
import type { SupabaseClientLike } from "@/server/supabase/types";

import { construirEntradaDelPlan, esCapatazDelPaso } from "./entrada";

/** Fila del historial de versiones de un paso (§12). */
export type VersionPlan = {
  id: string;
  version: number;
  status: "borrador" | "publicado";
  seed: number;
  created_at: string;
  stats: unknown;
};

/** Resultado de calcular y persistir un plan. */
export type ResultadoCalculoPlan =
  | { ok: true; planId: string; version: number; stats: PlanStats }
  | { ok: false; tipo: "sin_permiso"; error: string }
  | { ok: false; tipo: "infeasible"; diagnostico: DiagnosticoInfeasibilidad }
  | { ok: false; tipo: "error"; error: string };

/** Resultado de leer el historial de versiones de un paso. */
export type ResultadoHistorialPlanes =
  | { ok: true; planes: VersionPlan[] }
  | { ok: false; tipo: "sin_permiso"; error: string }
  | { ok: false; tipo: "error"; error: string };

/** Resultado de publicar un plan. */
export type ResultadoPublicacionPlan =
  | { ok: true }
  | { ok: false; tipo: "sin_permiso"; error: string }
  | { ok: false; tipo: "no_encontrado"; error: string }
  | { ok: false; tipo: "error"; error: string };

/** Operaciones del plan de relevos sobre un cliente de Supabase. */
export type ServicioPlan = {
  calcularYGuardar(
    entrada: { pasoId: string; seed?: number; semillas?: number[] },
    usuarioId: string,
  ): Promise<ResultadoCalculoPlan>;
  listarHistorial(
    pasoId: string,
    usuarioId: string,
  ): Promise<ResultadoHistorialPlanes>;
  publicar(
    planId: string,
    usuarioId: string,
  ): Promise<ResultadoPublicacionPlan>;
};

/** Mensaje de permiso del capataz dueño de la cuadrilla. */
const SIN_PERMISO =
  "No tienes permisos para operar con los planes de este paso.";

/**
 * Crea el servicio del plan sobre un cliente de Supabase. El cliente lleva la
 * sesión de quien llama: la RLS de §10 y las comprobaciones de propiedad de
 * este módulo son las dos barreras.
 */
export function crearServicioPlan(cliente: SupabaseClientLike): ServicioPlan {
  return {
    async calcularYGuardar({ pasoId, seed, semillas }, usuarioId) {
      if (!(await esCapatazDelPaso(cliente, pasoId, usuarioId))) {
        return { ok: false, tipo: "sin_permiso", error: SIN_PERMISO };
      }

      const construccion = await construirEntradaDelPlan(cliente, pasoId);
      if (!construccion.ok) {
        return { ok: false, tipo: "error", error: construccion.error };
      }
      const entrada = construccion.entrada;

      // S-6: con varias semillas se prueban todas y se guarda la mejor
      // (orden de §8.2). Con una sola, se usa esa.
      const semillasUsadas =
        semillas && semillas.length > 0
          ? semillas
          : [seed ?? SEMILLA_POR_DEFECTO];
      let mejor: { plan: RelevoPlan; stats: PlanStats } | null = null;
      let diagnostico: DiagnosticoInfeasibilidad | null = null;

      for (const semilla of semillasUsadas) {
        const resultado = solvePlanDeRelevos(entrada, { seed: semilla });
        if (!resultado.ok) {
          // Un plan imposible no es un error: es el diagnóstico con sus cifras.
          if (diagnostico === null) diagnostico = resultado.diagnostico;
          continue;
        }
        if (mejor === null || esMejorPlan(resultado.stats, mejor.stats)) {
          mejor = resultado;
        }
      }

      if (mejor === null) {
        return {
          ok: false,
          tipo: "infeasible",
          diagnostico:
            diagnostico ??
            diagnosticoGenerico(
              "No se ha encontrado un plan válido para este paso",
              { T: entrada.tramos.length },
              "revisar el reparto de costaleros por trabajadera y el número de tramos",
            ),
        };
      }

      const semillaGuardada = mejor.plan.seed;

      // S-5: la app nunca muestra ni guarda un plan que no pase la
      // verificación independiente de R1 a R4.
      const verificacion = verificarPlan(mejor.plan, entrada);
      const cumple =
        verificacion.cumplimiento.r1 &&
        verificacion.cumplimiento.r2 &&
        verificacion.cumplimiento.r3 &&
        verificacion.cumplimiento.r4;
      if (!cumple) {
        return {
          ok: false,
          tipo: "error",
          error:
            "El plan calculado no supera la verificación de R1 a R4 y no se ha guardado.",
        };
      }

      const planes = crearRepositorioPlanes(cliente);
      const guardado = await planes.guardar(pasoId, {
        seed: semillaGuardada,
        solverVersion: mejor.plan.solverVersion,
        stats: mejor.stats,
        relevos: filasDeRelevos(mejor.plan),
      });
      if (guardado.error || !guardado.data) {
        return {
          ok: false,
          tipo: "error",
          error: guardado.error?.message ?? "No se ha podido guardar el plan.",
        };
      }

      return {
        ok: true,
        planId: guardado.data.id,
        version: guardado.data.version,
        stats: mejor.stats,
      };
    },

    async listarHistorial(pasoId, usuarioId) {
      if (!(await esCapatazDelPaso(cliente, pasoId, usuarioId))) {
        return { ok: false, tipo: "sin_permiso", error: SIN_PERMISO };
      }

      const planes = crearRepositorioPlanes(cliente);
      const listado = await planes.listar({ pasoId });
      if (listado.error) {
        return { ok: false, tipo: "error", error: listado.error.message };
      }
      return {
        ok: true,
        planes: listado.data.map((plan) => ({
          id: plan.id,
          version: plan.version,
          status: plan.status,
          seed: plan.seed,
          created_at: plan.created_at,
          stats: plan.stats,
        })),
      };
    },

    async publicar(planId, usuarioId) {
      const planes = crearRepositorioPlanes(cliente);
      const plan = await planes.obtenerPorId(planId);
      if (plan.error) {
        return { ok: false, tipo: "error", error: plan.error.message };
      }
      if (!plan.data) {
        return {
          ok: false,
          tipo: "no_encontrado",
          error: "El plan no existe.",
        };
      }
      if (!(await esCapatazDelPaso(cliente, plan.data.paso_id, usuarioId))) {
        return { ok: false, tipo: "sin_permiso", error: SIN_PERMISO };
      }

      const publicado = await planes.publicar(planId);
      if (publicado.error || !publicado.data) {
        return {
          ok: false,
          tipo: "error",
          error:
            publicado.error?.message ?? "No se ha podido publicar el plan.",
        };
      }
      return { ok: true };
    },
  };
}

/**
 * ¿Es el primer plan mejor que el segundo? (orden de §8.2)
 *
 * 1. la dispersión dentro de cada pool (suma de `max − min` de cada
 *    trabajadera);
 * 2. la dispersión global entre costaleros del paso;
 * 3. el solapamiento entre la salida y la entrada (R5).
 */
export function esMejorPlan(primero: PlanStats, segundo: PlanStats): boolean {
  const dispersionPool = sumaDeDispersion(primero) - sumaDeDispersion(segundo);
  if (dispersionPool !== 0) return dispersionPool < 0;
  if (primero.dispercionGlobal !== segundo.dispercionGlobal) {
    return primero.dispercionGlobal < segundo.dispercionGlobal;
  }
  return primero.solapamientoSalidaEntrada < segundo.solapamientoSalidaEntrada;
}

/** Suma de la dispersión dentro de cada pool (EQ de §8.2, paso 2). */
function sumaDeDispersion(stats: PlanStats): number {
  return Object.values(stats.dispercionPorTrabajadera).reduce(
    (suma, valor) => suma + valor,
    0,
  );
}

/**
 * Las filas de `relevos` del plan: una por (tramo, costalero) con su estado.
 *
 * El orden es el del propio plan (tramos del recorrido y, dentro de ellos, el
 * orden del pool), así que el mismo plan produce siempre las mismas filas.
 */
function filasDeRelevos(plan: RelevoPlan): Array<{
  tramoId: string;
  costaleroId: string;
  estado: "en_paso" | "descanso";
}> {
  const relevos: Array<{
    tramoId: string;
    costaleroId: string;
    estado: "en_paso" | "descanso";
  }> = [];
  for (const [tramoId, estados] of Object.entries(plan.estados)) {
    for (const [costaleroId, estado] of Object.entries(estados)) {
      relevos.push({ tramoId, costaleroId, estado });
    }
  }
  return relevos;
}

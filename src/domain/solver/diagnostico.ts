/**
 * Traducción de la infactibilidad a los códigos cerrados de §11.4, con los números
 * concretos del caso y una sugerencia accionable en español.
 *
 * El conjunto de códigos es CERRADO: no se añaden ni se renombran.
 */

import type {
  CodigoDiagnostico,
  DiagnosticoInfeasibilidad,
  IdPrecondicion,
  ResultadoPrecondicion,
} from "../modelo";

/** Códigos de infactibilidad de §11.4, en el orden de la spec. */
export const CODIGOS_DIAGNOSTICO = [
  "SIN_SUPLENTES",
  "CUPO_INSUFICIENTE",
  "CAPACIDAD_CONSECUTIVOS",
  "BOQUILLAS_CONFLICTIVAS",
  "TRAMOS_INSUFICIENTES",
  "OTRO",
] as const satisfies readonly CodigoDiagnostico[];

/**
 * Código de §11.4 que corresponde a cada precondición de §7.4.
 * F-1 y F-4 son la misma falta de suplentes vista desde dos lados distintos (§7.4).
 */
export function codigoDePrecondicion(id: IdPrecondicion): CodigoDiagnostico {
  switch (id) {
    case "F-1":
    case "F-4":
      return "SIN_SUPLENTES";
    case "F-2":
      return "CUPO_INSUFICIENTE";
    case "F-3":
      return "CAPACIDAD_CONSECUTIVOS";
    case "F-5":
      return "BOQUILLAS_CONFLICTIVAS";
    case "F-6":
      return "TRAMOS_INSUFICIENTES";
  }
}

/**
 * Construye el diagnóstico de §11.4 a partir del estado de una precondición de §7.4:
 * código, mensaje con los números dentro, cifras y sugerencia accionable.
 */
export function diagnosticoDePrecondicion(
  precondicion: ResultadoPrecondicion,
): DiagnosticoInfeasibilidad {
  const diagnostico: DiagnosticoInfeasibilidad = {
    codigo: codigoDePrecondicion(precondicion.id),
    mensaje: precondicion.mensaje,
    cifras: { ...precondicion.cifras },
    sugerencia: precondicion.sugerencia,
  };
  if (precondicion.trabajaderaId !== undefined) {
    diagnostico.trabajaderaId = precondicion.trabajaderaId;
  }
  return diagnostico;
}

/**
 * Diagnóstico genérico (§11.4) para el caso en que la fase de búsqueda agota el
 * presupuesto sin encontrar solución pese a ser factible según F-1..F-6.
 */
export function diagnosticoGenerico(
  mensaje: string,
  cifras: Record<string, number>,
  sugerencia: string,
): DiagnosticoInfeasibilidad {
  return { codigo: "OTRO", mensaje, cifras: { ...cifras }, sugerencia };
}

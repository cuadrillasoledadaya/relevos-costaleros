/**
 * Tipos del dominio. Las firmas de `solvePlanDeRelevos`, `evaluarFactibilidad`,
 * `verificarPlan` y `tramosNecesarios` son las de §11.1 de la spec y no se modifican.
 */

/** Opciones del solver (§11.1). */
export type SolverOpciones = {
  /** Semilla del PRNG propio. Por defecto 20250330. */
  seed?: number;
  /** Presupuesto de iteraciones de la fase de optimización. Por defecto 200000. */
  maxIteraciones?: number;
};

/** Tipo de tramo del recorrido (§7.2, §8.3). */
export type TipoTramo = "salida" | "normal" | "entrada";

/** Entrada del solver: un paso con sus trabajaderas, sus tramos y sus boquillas (§11.1). */
export type RelevoPlanInput = {
  pasoId: string;
  trabajaderas: Array<{
    id: string;
    position: number;
    carga: number;
    pool: string[];
  }>;
  tramos: Array<{
    id: string;
    name: string;
    ordinal: number;
    kind: TipoTramo;
  }>;
  boquillas: string[];
  opciones?: SolverOpciones;
};

/** Estado de un costalero en un tramo (§7.2): exactamente uno de los dos. */
export type EstadoCostoalero = "en_paso" | "descanso";

/** Plan de relevos calculado (§11.1). */
export type RelevoPlan = {
  pasoId: string;
  seed: number;
  solverVersion: string;
  /** estados[tramoId][costaleroId] */
  estados: Record<string, Record<string, EstadoCostoalero>>;
  /** porTrabajadera[tramoId][trabajaderaId] = { enPaso: string[]; descansan: string[] } */
  porTrabajadera: Record<
    string,
    Record<string, { enPaso: string[]; descansan: string[] }>
  >;
};

/** Estadísticas del plan y cumplimiento de las reglas (§11.1). */
export type PlanStats = {
  descansosPorCostalero: Record<string, number>;
  descansosPorTrabajadera: Record<string, Record<string, number>>;
  dispercionPorTrabajadera: Record<string, number>;
  dispercionGlobal: number;
  solapamientoSalidaEntrada: number;
  cumplimiento: {
    r1: boolean;
    r2: boolean;
    r3: boolean;
    r4: boolean;
    r5: { valor: number; maximo: number };
  };
};

/**
 * Códigos cerrados de infactibilidad (§11.4). El conjunto es cerrado: no se añaden
 * ni se renombran.
 */
export type CodigoDiagnostico =
  | "SIN_SUPLENTES"
  | "CUPO_INSUFICIENTE"
  | "CAPACIDAD_CONSECUTIVOS"
  | "BOQUILLAS_CONFLICTIVAS"
  | "TRAMOS_INSUFICIENTES"
  | "OTRO";

/** Diagnóstico de infactibilidad con números y sugerencia accionable (§11.4). */
export type DiagnosticoInfeasibilidad = {
  codigo: CodigoDiagnostico;
  mensaje: string;
  trabajaderaId?: string;
  cifras: Record<string, number>;
  sugerencia: string;
};

/** Resultado del solver: plan válido o diagnóstico de infactibilidad (§11.1). */
export type RelevoPlanResult =
  | { ok: true; plan: RelevoPlan; stats: PlanStats }
  | { ok: false; diagnostico: DiagnosticoInfeasibilidad };

/** Identificador de precondición de factibilidad (§7.4). */
export type IdPrecondicion = "F-1" | "F-2" | "F-3" | "F-4" | "F-5" | "F-6";

/** Estado de una precondición de factibilidad con sus cifras (§7.4). */
export type ResultadoPrecondicion = {
  id: IdPrecondicion;
  cumple: boolean;
  mensaje: string;
  cifras: Record<string, number>;
  sugerencia: string;
  trabajaderaId?: string;
};

/** Resultado de `evaluarFactibilidad`: el estado de F-1..F-6 (§7.4, §11.1). */
export type ResultadoFactibilidad = {
  /** `true` solo si se cumplen las seis precondiciones. */
  factible: boolean;
  /** Estado de cada precondición, en el orden F-1..F-6. */
  precondiciones: ResultadoPrecondicion[];
  /** Diagnóstico de la primera precondición incumplida (`null` si es factible). */
  diagnostico: DiagnosticoInfeasibilidad | null;
  /** `tramosNecesarios` de cada trabajadera (§7.3). */
  tramosMinimosPorTrabajadera: Record<string, number>;
  /** `T` propuesto: el máximo de los `tramosNecesarios` por trabajadera (§7.3, supuesto S-3). */
  tramosMinimos: number;
};

/** Trabajadera de la entrada del solver (§11.1). */
export type TrabajaderaEntrada = RelevoPlanInput["trabajaderas"][number];

/** Tramo de la entrada del solver (§11.1). */
export type TramoEntrada = RelevoPlanInput["tramos"][number];

/** Estado de una persona en un tramo dentro del plan (§7.2). */
export type EstadoEnTramo = Record<string, EstadoCostoalero>;

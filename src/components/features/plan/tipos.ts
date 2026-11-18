/**
 * Tipos planos que viajan entre la página del plan (servidor) y sus
 * componentes (cliente). No contienen tipos de Supabase: la pantalla sólo
 * necesita identificadores, números y texto.
 *
 * El plan que se muestra es el que está **guardado en la base de datos** y
 * que el servidor ha vuelto a verificar con `verificarPlan` (S-5): aquí llega
 * ya verificado.
 */

import type { TipoTramo } from "@/domain/glosario";
import type { EstadoCostoalero, PlanStats } from "@/domain/modelo";

/** Un tramo del recorrido tal y como lo presenta la pantalla. */
export type TramoPlan = {
  id: string;
  name: string;
  ordinal: number;
  kind: TipoTramo;
};

/** Una trabajadera del paso con su pool. */
export type TrabajadoraPlan = {
  id: string;
  position: number;
  carga: number;
  /** Ids de los costaleros del pool, en el orden en que se muestran. */
  pool: string[];
};

/** Un costalero del paso, con su nombre. */
export type PersonaPlan = {
  id: string;
  nombre: string;
  /** Es una de las dos boquillas del paso (§5). */
  esBoquilla: boolean;
};

/** Datos del paso que necesita la pantalla. */
export type PasoPlan = {
  id: string;
  cuadrilla_id: string;
  name: string;
  season: number;
};

/** Una versión del plan en el historial. */
export type VersionPlan = {
  id: string;
  version: number;
  status: "borrador" | "publicado";
  seed: number;
  created_at: string;
};

/** El plan guardado, tal y como lo muestra la pantalla. */
export type PlanEnPantalla = {
  id: string;
  version: number;
  status: "borrador" | "publicado";
  seed: number;
  /** `estados[tramoId][costaleroId]` → `en_paso` o `descanso`. */
  estados: Record<string, Record<string, EstadoCostoalero>>;
  /** `porTrabajadera[tramoId][trabajaderaId]` → los que van y los que descansan. */
  porTrabajadera: Record<
    string,
    Record<string, { enPaso: string[]; descansan: string[] }>
  >;
};

/** Todo lo que la página entrega al componente cliente. */
export type DatosPantallaPlan = {
  paso: PasoPlan;
  /** Trabajadoras del paso, ordenadas por posición. */
  trabajadoras: TrabajadoraPlan[];
  /** Recorrido del paso, en orden. */
  tramos: TramoPlan[];
  /** Costaleros del paso con su nombre. */
  personas: PersonaPlan[];
  /** Historial de versiones, la más reciente primero. */
  versiones: VersionPlan[];
  /** El plan que se muestra, si el paso tiene alguno. */
  plan: PlanEnPantalla | null;
  /** Las estadísticas del plan, recalculadas al leerlo de la base. */
  estadisticas: PlanStats | null;
  /**
   * `false` cuando el plan guardado ya no encaja con la configuración
   * actual del paso: la pantalla no lo muestra (§11.3, S-5).
   */
  planCumple: boolean;
  /** Semilla por defecto del solver (§11.1). */
  semillaPorDefecto: number;
};

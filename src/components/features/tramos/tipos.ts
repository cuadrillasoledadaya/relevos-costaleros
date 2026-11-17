/**
 * Tipos planos que viajan entre la página de tramos (servidor) y sus
 * componentes (cliente). No contienen tipos de Supabase: la pantalla sólo
 * necesita identificadores, números y texto.
 */

import type { TipoTramo } from "@/domain/glosario";
import type { AvisoTramo } from "@/domain/tramos";

/** Un tramo del recorrido tal y como lo presenta la pantalla. */
export type TramoPantalla = {
  id: string;
  name: string;
  ordinal: number;
  kind: TipoTramo;
};

/** Una trabajadera con su pool de costaleros. */
export type TrabajadoraPantalla = {
  id: string;
  position: number;
  carga: number;
  /** Ids de los costaleros asignados a la trabajadera. */
  pool: string[];
};

/** Datos del paso que necesita la pantalla. */
export type PasoPantalla = {
  id: string;
  cuadrilla_id: string;
  name: string;
  season: number;
};

/** Todos los datos que la página entrega al componente cliente. */
export type DatosPantallaTramos = {
  paso: PasoPantalla;
  /** Trabajadoras del paso, ordenadas por posición. */
  trabajadoras: TrabajadoraPantalla[];
  /** Recorrido guardado, en el orden devuelto por el servidor. */
  tramos: TramoPantalla[];
  /** Ids de las boquillas elegidas para el paso. */
  boquillas: string[];
  /** Avisos iniciales de coherencia del recorrido. */
  avisos: AvisoTramo[];
};

/** Datos normalizados que devuelven las server actions de tramos. */
export type DatosAccionTramos = {
  tramos: TramoPantalla[];
  avisos: AvisoTramo[];
};

/** Resultado de una mutación del recorrido. */
export type ResultadoAccionTramos =
  | {
      ok: true;
      mensaje: string;
      datos: DatosAccionTramos;
    }
  | { ok: false; error: string };

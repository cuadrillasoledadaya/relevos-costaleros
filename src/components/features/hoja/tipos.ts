/**
 * Tipos planos que viajan entre la página de la hoja (servidor) y sus
 * componentes (cliente). No contienen tipos de Supabase.
 */

import type { LadoPuesto, TipoTrabajadera } from "@/domain/glosario";
import type { TipoTramo } from "@/domain/modelo";

/** Un puesto de la trabajadera (§6), de izquierda a derecha. */
export type PuestoDeHoja = {
  indice: number;
  nombre: string;
  lado: LadoPuesto;
};

/** La persona que ocupa un puesto en un tramo. */
export type PersonaEnPuesto = {
  costaleroId: string;
  nombre: string;
  puesto: string;
};

/** Una fila de la hoja: un tramo del recorrido. */
export type FilaDeHoja = {
  tramoId: string;
  tramo: string;
  ordinal: number;
  tipo: TipoTramo;
  /** La persona de cada puesto; `null` si ese puesto queda vacío. */
  personas: Array<PersonaEnPuesto | null>;
};

/** Una hoja: una trabajadera del paso. */
export type HojaDeTrabajadera = {
  id: string;
  position: number;
  tipo: TipoTrabajadera;
  puestos: PuestoDeHoja[];
  filas: FilaDeHoja[];
};

/** Datos del paso y del plan que se imprimen. */
export type DatosHoja = {
  paso: {
    id: string;
    nombre: string;
    anio: number;
    cuadrilla: string;
  };
  plan: {
    id: string;
    version: number;
    status: "borrador" | "publicado";
    seed: number;
    created_at: string;
  };
  /** Hojas, en orden de posición. */
  hojas: HojaDeTrabajadera[];
  /** Fecha en que se generó la hoja. */
  generado: string;
};

/**
 * Tipos que viajan entre la pantalla (servidor) y el wizard (cliente).
 *
 * Son una vista plana de lo que hay en la base de datos (§10): el wizard no
 * necesita más y así no depende de las tablas de Supabase.
 */

import type { TipoTramo } from "@/domain/glosario";
import type { ResultadoFactibilidad } from "@/domain/modelo";

/** Costalero de la cuadrilla, tal y como lo ve el wizard. */
export type DatosCostalero = {
  id: string;
  full_name: string;
  nickname: string | null;
};

/** Trabajadera del paso con su pool (los costaleros asignados). */
export type DatosTrabajadora = {
  id: string;
  position: number;
  carga: number;
  /** Ids de los costaleros del pool. */
  pool: string[];
};

/** Tramo del recorrido. */
export type DatosTramo = {
  id: string;
  name: string;
  ordinal: number;
  kind: TipoTramo;
};

/** Datos del paso (§10: `pasos`). */
export type DatosPaso = {
  id: string;
  cuadrilla_id: string;
  name: string;
  season: number;
  num_trabajaderas: number;
};

/** Todo lo que el wizard necesita del servidor. */
export type PropiedadesWizard = {
  paso: DatosPaso;
  cuadrillaId: string;
  /** Trabajaderas del paso, ordenadas por posición. */
  trabajaderas: DatosTrabajadora[];
  /** Tramos guardados del recorrido. */
  tramos: DatosTramo[];
  /** Costaleros de la cuadrilla. */
  costaleros: DatosCostalero[];
  /** Ids de las 2 boquillas del paso. */
  boquillas: string[];
  /** Firma de los datos del servidor: si cambia, el wizard se resincroniza. */
  version: string;
};

/** Estado editable del wizard. */
export type EstadoWizard = {
  nombre: string;
  anio: number;
  numTrabajaderas: number;
  /** Pool de cada trabajadera: `trabajaderaId` → ids de costaleros. */
  reparto: Record<string, string[]>;
  /** Carga de cada trabajadera: `trabajaderaId` → carga (1..5). */
  cargas: Record<string, number>;
  /** Ids de las 2 boquillas. */
  boquillas: string[];
  /** Tramos del recorrido (guardados o propuestos). */
  tramos: DatosTramo[];
};

/** Callbacks que el wizard expone a cada paso. */
export type AccionesWizard = {
  guardarDatos: () => Promise<void>;
  guardarReparto: () => Promise<void>;
  guardarBoquillas: () => Promise<void>;
  guardarTramos: () => Promise<void>;
  cambiarPaso: (indice: number) => void;
  irAlPlan: () => void;
};

/** Lo que recibe cada paso del wizard. */
export type PropiedadesPaso = {
  /** Estado editable del wizard. */
  estado: EstadoWizard;
  /** Datos que viennent del servidor. */
  datos: PropiedadesWizard;
  /** Resultado de `evaluarFactibilidad` con el estado actual (W2). */
  factibilidad: ResultadoFactibilidad;
  /** Hay una guardado en curso. */
  cargando: boolean;
  /** Mensaje de la última acción correcta. */
  aviso: string | null;
  /** Mensaje de error de la última acción. */
  error: string | null;
  /** Acciones del wizard. */
  acciones: AccionesWizard;
  /** Cambia una parte del estado del wizard. */
  actualizar: (cambio: Partial<EstadoWizard>) => void;
};

/**
 * Utilidades puras del wizard de creación del paso (P3).
 *
 * Toda la lógica de dominio (tramos necesarios, precondiciones F-1..F-6,
 * nombres de puesto) viene de `src/domain/**` (W2): aquí solo se ordena, se
 * derivan datos de presentación y se construyen las entradas que consume
 * `evaluarFactibilidad`.
 */

import {
  LADOS_POR_POSICION,
  NUMERO_BOQUILLAS,
  PUESTOS_POR_TRABAJADERA,
  nombrePuesto,
  puestoDePosicion,
  tipoDeTrabajadera,
  type LadoPuesto,
  type Puesto,
  type TipoTrabajadera,
} from "@/domain/glosario";
import type { RelevoPlanInput } from "@/domain/modelo";
import { evaluarFactibilidad } from "@/domain/factibilidad";

import type {
  DatosCostalero,
  DatosTramo,
  DatosTrabajadora,
  EstadoWizard,
  PropiedadesWizard,
} from "./tipos";

/** Un puesto de una trabajadera con su nombre canónico (§6). */
export type PuestoDeTrabajadera = {
  /** Posición dentro de la trabajadera, de izquierda a derecha (0..4). */
  indice: number;
  /** Puesto: patero, costero, fijador o corriente. */
  puesto: Puesto;
  /** Nombre completo del puesto: "patero izquierdo", "corriente"… */
  nombre: string;
  /** Lado del paso que ocupa. */
  lado: LadoPuesto;
};

/** Texto de UI para el tipo de trabajadera (§6). */
export const TEXTO_TIPO_TRABAJADERA: Record<TipoTrabajadera, string> = {
  primera: "primera",
  intermedia: "intermedia",
  ultima: "última",
};

/** Estado inicial del wizard a partir de lo que hay en la base de datos. */
export function construirEstado(props: PropiedadesWizard): EstadoWizard {
  const reparto: Record<string, string[]> = {};
  const cargas: Record<string, number> = {};
  for (const trabajadera of props.trabajaderas) {
    reparto[trabajadera.id] = [...trabajadera.pool];
    cargas[trabajadera.id] = trabajadera.carga;
  }
  const base: EstadoWizard = {
    nombre: props.paso.name,
    anio: props.paso.season,
    numTrabajaderas: props.paso.num_trabajaderas,
    reparto,
    cargas,
    boquillas: [...props.boquillas],
    tramos: [],
  };
  if (props.tramos.length > 0) {
    base.tramos = props.tramos.map((tramo) => ({ ...tramo }));
    return base;
  }
  // Todavía no hay tramos guardados: se propone el número que hace falta
  // (§7.3: el máximo de los mínimos de cada trabajadera).
  const minimos = evaluarFactibilidad(
    entradaDeFactibilidad(base, props.paso.id, props.trabajaderas),
  ).tramosMinimos;
  const total = Number.isFinite(minimos) ? Math.max(2, minimos) : 2;
  base.tramos = tramosPropuestos(base, total);
  return base;
}

/**
 * Puestos de una trabajadera, de izquierda a derecha (§6): la primera y
 * la última llevan pateros y las intermedias costeros.
 */
export function puestosDe(
  posicion: number,
  total: number,
): PuestoDeTrabajadera[] {
  const tipo = tipoDeTrabajadera(posicion, total);
  return Array.from({ length: PUESTOS_POR_TRABAJADERA }, (_, indice) => ({
    indice,
    puesto: puestoDePosicion(tipo, indice) ?? "corriente",
    nombre: nombrePuesto(tipo, indice) ?? "",
    lado: LADOS_POR_POSICION[indice] ?? "centro",
  }));
}

/** Tipo de trabajadera (primera, intermedia o última) según §6. */
export function tipoDe(posicion: number, total: number): TipoTrabajadera {
  return tipoDeTrabajadera(posicion, total);
}

/**
 * Costaleros de un pool ordenados por nombre.
 *
 * El orden es canónico (el mismo que usa el repositorio) para que el puesto
 * que se muestra en pantalla sea siempre el mismo al recargar la página: el
 * app no decide quién es el corriente (P-6), lo decide el plan de relevos.
 */
export function costalerosOrdenados(
  ids: string[],
  costaleros: DatosCostalero[],
): DatosCostalero[] {
  const porId = new Map(
    costaleros.map((costalero) => [costalero.id, costalero]),
  );
  return ids
    .map((id) => porId.get(id))
    .filter((costalero): costalero is DatosCostalero => costalero !== undefined)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
}

/**
 * Entrada del dominio para `evaluarFactibilidad` con el estado actual del
 * wizard (§11.1).
 */
export function entradaDeFactibilidad(
  estado: EstadoWizard,
  pasoId: string,
  trabajaderas: DatosTrabajadora[],
): RelevoPlanInput {
  return {
    pasoId,
    trabajaderas: [...trabajaderas]
      .sort((a, b) => a.position - b.position)
      .map((trabajadera) => ({
        id: trabajadera.id,
        position: trabajadera.position,
        carga: estado.cargas[trabajadera.id] ?? trabajadera.carga,
        pool: estado.reparto[trabajadera.id] ?? [],
      })),
    tramos: [...estado.tramos]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((tramo) => ({
        id: tramo.id,
        name: tramo.name,
        ordinal: tramo.ordinal,
        kind: tramo.kind,
      })),
    boquillas: estado.boquillas,
  };
}

/**
 * Tramos propuestos para un número de tramos `total`: se conservan los nombres
 * ya guardados y se añaden los que faltaban. El primero es la `salida` y el
 * último la `entrada` (§8.3).
 */
export function tramosPropuestos(
  estado: EstadoWizard,
  total: number,
): DatosTramo[] {
  const existentes = [...estado.tramos].sort((a, b) => a.ordinal - b.ordinal);
  const propuesta: DatosTramo[] = [];
  for (let ordinal = 1; ordinal <= total; ordinal += 1) {
    const existente = existentes.find((tramo) => tramo.ordinal === ordinal);
    if (existente) {
      propuesta.push({ ...existente });
      continue;
    }
    propuesta.push({
      id: `propuesto-${String(ordinal)}`,
      name: `Tramo ${String(ordinal)}`,
      ordinal,
      kind: ordinal === 1 ? "salida" : ordinal === total ? "entrada" : "normal",
    });
  }
  return propuesta;
}

/**
 * Descansos que le tocarían a cada costalero de un pool con `total` tramos
 * (§7.2: en cada tramo descansan `r = pool - carga` costaleros del pool).
 */
export function descansosPorPersona(
  total: number,
  pool: number,
  carga: number,
): number {
  if (pool <= 0) return 0;
  const r = pool - carga;
  if (r <= 0) return 0;
  return (total * r) / pool;
}

/** ¿Se han elegido ya las 2 boquillas del paso (F-5)? */
export function boquillasCompletas(boquillas: string[]): boolean {
  return (
    boquillas.length === NUMERO_BOQUILLAS &&
    new Set(boquillas).size === NUMERO_BOQUILLAS
  );
}

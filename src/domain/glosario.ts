/**
 * Glosario cerrado del dominio (§5) y estructura de puestos (§6) de la spec
 * `docs/spec/PROMPT-relevos-costaleros.md`.
 *
 * Los términos no se renombran, traducen ni sustituyen (X-2). La grafía "trabadera" del
 * encargo se corrige a "trabajadera" (nota de grafía de §5); las citas textuales conservan
 * la grafía original solo cuando están marcadas como `verbatim:`.
 */

/** Los 16 términos del glosario cerrado de §5, en el orden de la spec. */
export const TERMINOS = {
  costalero: "costalero",
  paso: "paso",
  trabajadera: "trabajadera",
  patero: "patero",
  costero: "costero",
  fijador: "fijador",
  corriente: "corriente",
  boquilla: "boquilla",
  capataz: "capataz",
  cuadrilla: "cuadrilla",
  tramo: "tramo",
  relevo: "relevo",
  entrada: "entrada",
  salida: "salida",
  planDeRelevos: "plan de relevos",
  hojaDeRelevos: "hoja de relevos",
} as const;

/** Clave de un término del glosario de §5. */
export type Termino = keyof typeof TERMINOS;

/** Texto canónico de un término del glosario de §5. */
export type TextoTermino = (typeof TERMINOS)[Termino];

/** Uso operativo de cada término, según la tercera columna de la tabla de §5. */
export const DESCRIPCION_TERMINOS: Record<Termino, string> = {
  costalero: "Persona que carga el paso. Entidad persona del dominio.",
  paso: "Estructura que cargan los costaleros; consta de trabajaderas debajo.",
  trabajadera:
    "Unidad de organización de los relevos. Hay entre 6 y 10 por paso.",
  patero: "Puesto exterior de la primera y de la última trabajadera.",
  costero: "Puesto exterior de las trabajaderas intermedias.",
  fijador: "Puesto intermedio junto a los exteriores. Hay 2 por trabajadera.",
  corriente: "Puesto central de la trabajadera. Hay 1 por trabajadera.",
  boquilla: "Costalero con rol de mando bajo el paso. Hay 2 por paso.",
  capataz: "Usuario principal de la app: configura, calcula e imprime.",
  cuadrilla: "Agrupación de costaleros.",
  tramo: "Segmento del recorrido, con nombre. En cada tramo hay un relevo.",
  relevo: "Cambio de costaleros en un tramo.",
  salida: "Tipo de tramo: el primero del recorrido.",
  entrada: "Tipo de tramo: el último del recorrido.",
  planDeRelevos: "Pantalla y resultado del cálculo de relevos.",
  hojaDeRelevos: "Vista por trabajadera, imprimible.",
};

/** Puesto de una trabajadera (§6). */
export type Puesto = "patero" | "costero" | "fijador" | "corriente";

/** Lado del paso que ocupa un puesto (§6, orden izquierda→derecha). */
export type LadoPuesto = "izquierda" | "derecha" | "centro";

/** Tipo de trabajadera según su posición en el paso (§6). */
export type TipoTrabajadera = "primera" | "intermedia" | "ultima";

/** Puestos de izquierda a derecha por tipo de trabajadera (§6). */
export const PUESTOS_POR_TIPO: Record<TipoTrabajadera, readonly Puesto[]> = {
  primera: ["patero", "fijador", "corriente", "fijador", "patero"],
  intermedia: ["costero", "fijador", "corriente", "fijador", "costero"],
  ultima: ["patero", "fijador", "corriente", "fijador", "patero"],
};

/** Lado que ocupa cada puesto, en el orden izquierda→derecha de §6. */
export const LADOS_POR_POSICION: readonly LadoPuesto[] = [
  "izquierda",
  "izquierda",
  "centro",
  "derecha",
  "derecha",
];

/** Nombre completo de cada puesto (puesto + lado), en el orden izquierda→derecha de §6. */
export const NOMBRES_PUESTOS_POR_TIPO: Record<
  TipoTrabajadera,
  readonly string[]
> = {
  primera: [
    "patero izquierdo",
    "fijador izquierdo",
    "corriente",
    "fijador derecho",
    "patero derecho",
  ],
  intermedia: [
    "costero izquierdo",
    "fijador izquierdo",
    "corriente",
    "fijador derecho",
    "costero derecho",
  ],
  ultima: [
    "patero izquierdo",
    "fijador izquierdo",
    "corriente",
    "fijador derecho",
    "patero derecho",
  ],
};

/**
 * Tipo de trabajadera según su posición dentro del paso (§6).
 * `position` va de 1 a `total`; la primera y la última llevan pateros.
 */
export function tipoDeTrabajadera(
  position: number,
  total: number,
): TipoTrabajadera {
  if (position <= 1) return "primera";
  if (position >= total) return "ultima";
  return "intermedia";
}

/**
 * Puesto que corresponde a una posición (0 = izquierda) de una trabajadera (§6).
 */
export function puestoDePosicion(
  tipo: TipoTrabajadera,
  indice: number,
): Puesto | null {
  const puestos = PUESTOS_POR_TIPO[tipo];
  return puestos[indice] ?? null;
}

/**
 * Nombre completo del puesto que corresponde a una posición (0 = izquierda) de una
 * trabajadera (§6): "patero izquierdo", "corriente", "fijador derecho"…
 */
export function nombrePuesto(
  tipo: TipoTrabajadera,
  indice: number,
): string | null {
  const nombres = NOMBRES_PUESTOS_POR_TIPO[tipo];
  return nombres[indice] ?? null;
}

/** Tipo de tramo (§8.3 y §10: `kind`). */
export const TIPOS_TRAMO = {
  salida: "salida",
  normal: "normal",
  entrada: "entrada",
} as const;

/** Tipo de tramo admitido. */
export type TipoTramo = (typeof TIPOS_TRAMO)[keyof typeof TIPOS_TRAMO];

/** Carga por defecto de una trabajadera (§6 y supuesto S-6). */
export const CARGA_DEFECTO = 5;

/** Puestos por trabajadera (§6: 5 costaleros). */
export const PUESTOS_POR_TRABAJADERA = 5;

/** Descansos mínimos por costalero en todo el recorrido (regla R2). */
export const DESCANSOS_MINIMOS_POR_COSTALERO = 2;

/** Boquillas por paso (§2 y precondición F-5). */
export const NUMERO_BOQUILLAS = 2;

/**
 * Generación de los CSV de la exportación (P7, §12).
 *
 * Son funciones puras: reciben las filas ya montadas y devuelven el texto.
 * El separador es `;` (que es lo que espera Excel en español) y el archivo
 * lleva BOM UTF-8 para que los acentos se abran bien.
 */

/** Separador de columnas: el que usa Excel en español. */
export const SEPARADOR_CSV = ";";

/** Marca de orden de bytes para UTF-8: sin ella Excel rompe los acentos. */
export const BOM_UTF8 = "\uFEFF";

/** Una fila del CSV de relevos: un (tramo, costalero). */
export type FilaDeRelevo = {
  /** Nombre del tramo. */
  tramo: string;
  /** Ordinal del tramo en el recorrido (1..T). */
  ordinal: number;
  /** Tipo del tramo: `salida`, `normal` o `entrada`. */
  tipo: "salida" | "normal" | "entrada";
  /** Nombre del costalero. */
  costalero: string;
  /** Si en ese tramo va en el paso o descansa. */
  estado: "en_paso" | "descanso";
  /** Puesto que ocupa en la trabajadera; vacío si descansa. */
  puesto: string;
  /** Nombre de la trabajadera. */
  trabajadera: string;
};

/** Una fila del CSV de descansos: un costalero. */
export type FilaDeDescansos = {
  /** Nombre del costalero. */
  costalero: string;
  /** Tramos en los que descansa, separados por comas. */
  descansaEn: string;
  /** Número total de descansos. */
  total: number;
};

/**
 * Una celda del CSV: si trae separador, comillas o salto de línea, va entre
 * comillas y las comillas de dentro se duplican (como manda el RFC 4180).
 */
function celda(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (
    texto.includes(SEPARADOR_CSV) ||
    texto.includes('"') ||
    texto.includes("\n") ||
    texto.includes("\r")
  ) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Une las filas en un CSV: cabecera, filas y fin de línea CRLF. */
function csv(
  cabecera: Array<string | number>,
  filas: Array<Array<string | number>>,
): string {
  const lineas = [cabecera.map(celda).join(SEPARADOR_CSV)];
  for (const fila of filas) {
    lineas.push(fila.map(celda).join(SEPARADOR_CSV));
  }
  return `${BOM_UTF8}${lineas.join("\r\n")}\r\n`;
}

/**
 * CSV de los relevos: una fila por (tramo, costalero) con su estado, su
 * puesto y su trabajadera.
 */
export function csvDeRelevos(filas: FilaDeRelevo[]): string {
  return csv(
    [
      "tramo",
      "ordinal",
      "tipo",
      "costalero",
      "estado",
      "puesto",
      "trabajadera",
    ],
    filas.map((fila) => [
      fila.tramo,
      fila.ordinal,
      fila.tipo,
      fila.costalero,
      fila.estado,
      fila.puesto,
      fila.trabajadera,
    ]),
  );
}

/**
 * CSV del plan por costalero: una fila por persona con los tramos en los que
 * descansa y su total de descansos.
 */
export function csvDeDescansos(filas: FilaDeDescansos[]): string {
  return csv(
    ["costalero", "descansa en", "total de descansos"],
    filas.map((fila) => [fila.costalero, fila.descansaEn, fila.total]),
  );
}

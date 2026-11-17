/**
 * Reglas del recorrido de tramos (§8.3).
 *
 * El recorrido va de la salida de la iglesia a la entrada y se particiona en
 * tramos. El primero es la `salida` y el último es la `entrada`; los de en
 * medio son `normal`. Estas funciones son puras: no tocan la base de datos y
 * las usan igual el servidor (que manda) y la pantalla (que avisa).
 */

import type { TipoTramo } from "./glosario";

/** Un tramo del recorrido, tal y como lo ve la aplicación. */
export type TramoRecorrido = {
  id: string;
  name: string;
  ordinal: number;
  kind: TipoTramo;
};

/** Aviso sobre la coherencia de los tipos del recorrido. */
export type AvisoTramo = {
  /** Id del tramo al que se refiere el aviso, si se refiere a uno. */
  id: string | null;
  mensaje: string;
};

/**
 * Tipos canónicos de un recorrido de `total` tramos: el primero es la salida y
 * el último la entrada.
 */
export function tiposCanonicos(total: number): TipoTramo[] {
  const tipos: TipoTramo[] = [];
  for (let posicion = 1; posicion <= total; posicion += 1) {
    if (posicion === 1) tipos.push("salida");
    else if (posicion === total) tipos.push("entrada");
    else tipos.push("normal");
  }
  return tipos;
}

/**
 * Avisos de incoherencia del recorrido: si el primer tramo no es la salida, si
 * el último no es la entrada, si hay más de una salida o más de una entrada, o
 * si el recorrido no tiene los dos tramos mínimos.
 *
 * Los tipos los pone el capataz a mano (`cambiarTipoTramo`), así que puede
 * dejar el recorrido incoherente: aquí se dice en qué.
 */
export function avisosDeCoherencia(
  tramos: readonly TramoRecorrido[],
): AvisoTramo[] {
  const avisos: AvisoTramo[] = [];
  const ordenados = [...tramos].sort((a, b) => a.ordinal - b.ordinal);

  if (ordenados.length === 0) {
    return [
      {
        id: null,
        mensaje:
          "El recorrido no tiene tramos: hay que crear al menos la salida y la entrada.",
      },
    ];
  }

  if (ordenados.length < 2) {
    avisos.push({
      id: null,
      mensaje:
        "El recorrido tiene un solo tramo: hacen falta al menos 2, la salida y la entrada.",
    });
  }

  const primero = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  if (primero && primero.kind !== "salida") {
    avisos.push({
      id: primero.id,
      mensaje: `El primer tramo del recorrido («${primero.name}») no es la salida.`,
    });
  }
  if (ultimo && ultimo.kind !== "entrada") {
    avisos.push({
      id: ultimo.id,
      mensaje: `El último tramo del recorrido («${ultimo.name}») no es la entrada.`,
    });
  }

  const salidas = ordenados.filter((tramo) => tramo.kind === "salida");
  if (salidas.length > 1) {
    avisos.push({
      id: null,
      mensaje: `Hay ${String(salidas.length)} tramos marcados como salida: sólo el primero del recorrido es la salida.`,
    });
  }
  const entradas = ordenados.filter((tramo) => tramo.kind === "entrada");
  if (entradas.length > 1) {
    avisos.push({
      id: null,
      mensaje: `Hay ${String(entradas.length)} tramos marcados como entrada: sólo el último del recorrido es la entrada.`,
    });
  }

  return avisos;
}

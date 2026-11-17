/**
 * Dobles del repositorio de tramos para probar las server actions del
 * apartado de tramos sin base de datos.
 *
 * El almacén en memoria reproduce la semántica de las funciones de Postgres
 * (`anexar_tramo`, `borrar_tramo` y `reordenar_tramos`): ordinales 1..N sin
 * huecos ni repetidos y tipos canónicos (el primero `salida`, el último
 * `entrada`).
 */

import type { RepositorioTramos, Tramo } from "@/server/repos/tramos";

export const PASO_ID = "22222222-2222-4222-8222-222222222222";
export const OTRO_PASO_ID = "22222222-2222-4222-8222-222222222299";

export const TRAMO_1 = "33333333-3333-4333-8333-333333333331";
export const TRAMO_2 = "33333333-3333-4333-8333-333333333332";
export const TRAMO_3 = "33333333-3333-4333-8333-333333333333";
export const TRAMO_4 = "33333333-3333-4333-8333-333333333334";

/** Recorrido de prueba: salida, dos tramos normales y entrada. */
export function crearAlmacen(): Tramo[] {
  return [
    {
      id: TRAMO_1,
      paso_id: PASO_ID,
      name: "Salida",
      ordinal: 1,
      kind: "salida",
    },
    {
      id: TRAMO_2,
      paso_id: PASO_ID,
      name: "Tramo 2",
      ordinal: 2,
      kind: "normal",
    },
    {
      id: TRAMO_3,
      paso_id: PASO_ID,
      name: "Tramo 3",
      ordinal: 3,
      kind: "normal",
    },
    {
      id: TRAMO_4,
      paso_id: PASO_ID,
      name: "Entrada",
      ordinal: 4,
      kind: "entrada",
    },
  ];
}

let contador = 0;

function idNuevo(): string {
  contador += 1;
  return `99999999-9999-4999-8999-${String(contador).padStart(12, "0")}`;
}

/** Renumera 1..N y vuelve a poner los tipos canónicos. */
function normalizar(tramos: Tramo[]): Tramo[] {
  const ordenados = [...tramos].sort((a, b) => a.ordinal - b.ordinal);
  const total = ordenados.length;
  ordenados.forEach((tramo, indice) => {
    tramo.ordinal = indice + 1;
    tramo.kind =
      indice === 0 ? "salida" : indice === total - 1 ? "entrada" : "normal";
  });
  return ordenados;
}

/** Repositorio de tramos en memoria sobre un almacén. */
export function crearRepositorio(almacen: Tramo[]): RepositorioTramos {
  return {
    listarPorPaso: async (pasoId) => ({
      data: almacen
        .filter((tramo) => tramo.paso_id === pasoId)
        .sort((a, b) => a.ordinal - b.ordinal),
      error: null,
    }),
    obtenerPorId: async (id) => ({
      data: almacen.find((tramo) => tramo.id === id) ?? null,
      error: null,
    }),
    crear: async (entrada) => {
      const tramo: Tramo = {
        id: idNuevo(),
        paso_id: entrada.paso_id,
        name: entrada.name,
        ordinal: entrada.ordinal,
        kind: entrada.kind ?? "normal",
      };
      almacen.push(tramo);
      return { data: tramo, error: null };
    },
    actualizar: async (id, cambios) => {
      const tramo = almacen.find((candidate) => candidate.id === id);
      if (!tramo) {
        return { data: null, error: { message: "El tramo no existe" } };
      }
      Object.assign(tramo, cambios);
      return { data: tramo, error: null };
    },
    actualizarEnRecorrido: async (id, cambios) => {
      const tramo = almacen.find((candidate) => candidate.id === id);
      if (!tramo) {
        return {
          data: [],
          error: { message: "El tramo no existe." },
        };
      }
      if (cambios.name !== undefined && cambios.name.trim() === "") {
        return {
          data: [],
          error: { message: "El nombre del tramo no puede estar vacío." },
        };
      }
      if (
        cambios.kind !== undefined &&
        !["salida", "normal", "entrada"].includes(cambios.kind)
      ) {
        return {
          data: [],
          error: {
            message:
              "El tipo del tramo tiene que ser salida, normal o entrada.",
          },
        };
      }

      if (cambios.name !== undefined) tramo.name = cambios.name.trim();
      if (cambios.kind !== undefined) tramo.kind = cambios.kind;
      return {
        data: almacen
          .filter((candidate) => candidate.paso_id === tramo.paso_id)
          .sort((a, b) => a.ordinal - b.ordinal),
        error: null,
      };
    },
    eliminar: async (id) => {
      const indice = almacen.findIndex((tramo) => tramo.id === id);
      if (indice < 0) {
        return { data: [], error: { message: "El tramo no existe" } };
      }
      const [borrado] = almacen.splice(indice, 1);
      if (!borrado) {
        return { data: [], error: { message: "El tramo no existe" } };
      }
      return {
        data: normalizar(
          almacen.filter((tramo) => tramo.paso_id === borrado.paso_id),
        ),
        error: null,
      };
    },
    anexar: async (pasoId, nombre) => {
      const delPaso = almacen.filter((tramo) => tramo.paso_id === pasoId);
      const total = delPaso.length;
      const nuevo: Tramo = {
        id: idNuevo(),
        paso_id: pasoId,
        name: nombre,
        ordinal: total + 1,
        kind: total === 0 ? "salida" : "entrada",
      };
      almacen.push(nuevo);
      return {
        data: normalizar(almacen.filter((tramo) => tramo.paso_id === pasoId)),
        error: null,
      };
    },
    reordenar: async (pasoId, orden) => {
      const delPaso = almacen.filter((tramo) => tramo.paso_id === pasoId);
      if (orden.length !== delPaso.length) {
        return {
          data: [],
          error: {
            message:
              "La lista de tramos no coincide con los tramos guardados del paso.",
          },
        };
      }
      const porId = new Map(delPaso.map((tramo) => [tramo.id, tramo]));
      for (const [indice, id] of orden.entries()) {
        const tramo = porId.get(id);
        if (!tramo) {
          return {
            data: [],
            error: {
              message:
                "La lista de tramos no coincide con los tramos guardados del paso.",
            },
          };
        }
        tramo.ordinal = indice + 1;
      }
      return {
        data: normalizar(almacen.filter((tramo) => tramo.paso_id === pasoId)),
        error: null,
      };
    },
  };
}

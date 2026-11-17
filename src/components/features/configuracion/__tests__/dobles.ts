/**
 * Dobles de los repositorios de W1 para probar las server actions del paso
 * sin base de datos: un almacén en memoria con las mismas filas que las
 * tablas de §10.
 */

import type { RepositoriosPaso } from "@/server/actions/paso";
import type {
  Asignacion,
  RepositorioAsignaciones,
} from "@/server/repos/asignaciones";
import type {
  Costalero,
  RepositorioCostaleros,
} from "@/server/repos/costaleros";
import type { Paso, RepositorioPasos } from "@/server/repos/pasos";
import type {
  RepositorioTrabajaderas,
  Trabajadora,
} from "@/server/repos/trabajaderas";
import type { RepositorioTramos, Tramo } from "@/server/repos/tramos";

/** Ids de prueba (UUIDs válidos: los schemas de W1 los exigen). */
export const CUADRILLA_ID = "11111111-1111-4111-8111-111111111111";
export const PASO_ID = "22222222-2222-4222-8222-222222222222";
export const T1 = "33333333-3333-4333-8333-333333333331";
export const T2 = "33333333-3333-4333-8333-333333333332";
export const T3 = "33333333-3333-4333-8333-333333333333";
export const C1 = "44444444-4444-4444-8444-000000000001";
export const C2 = "44444444-4444-4444-8444-000000000002";
export const C3 = "44444444-4444-4444-8444-000000000003";
export const C4 = "44444444-4444-4444-8444-000000000004";
export const C5 = "44444444-4444-4444-8444-000000000005";
export const C6 = "44444444-4444-4444-8444-000000000006";
export const C7 = "44444444-4444-4444-8444-000000000007";
export const C8 = "44444444-4444-4444-8444-000000000008";
export const C9 = "44444444-4444-4444-8444-000000000009";
export const C10 = "44444444-4444-4444-8444-000000000010";

/** Tablas del almacén en memoria. */
export type Almacen = {
  pasos: Paso[];
  trabajaderas: Trabajadora[];
  asignaciones: Asignacion[];
  tramos: Tramo[];
  costaleros: Costalero[];
};

/** Contador de ids para las filas nuevas. */
let contador = 0;

function idNuevo(): string {
  contador += 1;
  return `99999999-9999-4999-8999-${String(contador).padStart(12, "0")}`;
}

/** Costalero de prueba. */
export function costalero(
  id: string,
  fullName: string,
  cuadrillaId = CUADRILLA_ID,
): Costalero {
  return {
    id,
    cuadrilla_id: cuadrillaId,
    profile_id: null,
    full_name: fullName,
    nickname: null,
    phone: null,
    notes: null,
    active: true,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };
}

/** Almacén con una cuadrilla de `cantidad` costaleros y un paso. */
export function crearAlmacen(cantidadCostaleros = 10): Almacen {
  const ids = [C1, C2, C3, C4, C5, C6, C7, C8, C9, C10];
  const costaleros: Costalero[] = [];
  for (let indice = 1; indice <= cantidadCostaleros; indice += 1) {
    const id = ids[indice - 1];
    if (!id) break;
    costaleros.push(
      costalero(id, `Costalero ${String(indice).padStart(2, "0")}`),
    );
  }
  return {
    pasos: [
      {
        id: PASO_ID,
        cuadrilla_id: CUADRILLA_ID,
        name: "Paso de prueba",
        season: 2025,
        num_trabajaderas: 3,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      },
    ],
    trabajaderas: [
      { id: T1, paso_id: PASO_ID, position: 1, carga: 5 },
      { id: T2, paso_id: PASO_ID, position: 2, carga: 5 },
      { id: T3, paso_id: PASO_ID, position: 3, carga: 5 },
    ],
    asignaciones: [],
    tramos: [],
    costaleros,
  };
}

/** Repositorios en memoria sobre un almacén. */
export function crearRepositorios(almacen: Almacen): RepositoriosPaso {
  const pasos: RepositorioPasos = {
    listarPorCuadrilla: async (cuadrillaId) => ({
      data: almacen.pasos.filter((paso) => paso.cuadrilla_id === cuadrillaId),
      error: null,
    }),
    obtenerPorId: async (id) => ({
      data: almacen.pasos.find((paso) => paso.id === id) ?? null,
      error: null,
    }),
    crear: async (entrada) => {
      const paso: Paso = {
        id: idNuevo(),
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        ...entrada,
      };
      almacen.pasos.push(paso);
      return { data: paso, error: null };
    },
    actualizar: async (id, cambios) => {
      const paso = almacen.pasos.find((candidate) => candidate.id === id);
      if (!paso) {
        return { data: null, error: { message: "El paso no existe" } };
      }
      Object.assign(paso, cambios);
      return { data: paso, error: null };
    },
    eliminar: async (id) => {
      const indice = almacen.pasos.findIndex((paso) => paso.id === id);
      if (indice < 0) {
        return { data: null, error: { message: "El paso no existe" } };
      }
      const [paso] = almacen.pasos.splice(indice, 1);
      return { data: paso ?? null, error: null };
    },
  };

  const trabajaderas: RepositorioTrabajaderas = {
    listarPorPaso: async (pasoId) => ({
      data: almacen.trabajaderas
        .filter((trabajadera) => trabajadera.paso_id === pasoId)
        .sort((a, b) => a.position - b.position),
      error: null,
    }),
    obtenerPorId: async (id) => ({
      data:
        almacen.trabajaderas.find((trabajadera) => trabajadera.id === id) ??
        null,
      error: null,
    }),
    crear: async (entrada) => {
      const trabajadera: Trabajadora = {
        id: idNuevo(),
        paso_id: entrada.paso_id,
        position: entrada.position,
        carga: entrada.carga ?? 5,
      };
      almacen.trabajaderas.push(trabajadera);
      return { data: trabajadera, error: null };
    },
    actualizar: async (id, cambios) => {
      const trabajadera = almacen.trabajaderas.find(
        (candidate) => candidate.id === id,
      );
      if (!trabajadera) {
        return { data: null, error: { message: "La trabajadera no existe" } };
      }
      Object.assign(trabajadera, cambios);
      return { data: trabajadera, error: null };
    },
    eliminar: async (id) => {
      const indice = almacen.trabajaderas.findIndex(
        (trabajadera) => trabajadera.id === id,
      );
      if (indice < 0) {
        return { data: null, error: { message: "La trabajadera no existe" } };
      }
      const [trabajadera] = almacen.trabajaderas.splice(indice, 1);
      almacen.asignaciones = almacen.asignaciones.filter(
        (asignacion) => asignacion.trabajadera_id !== id,
      );
      return { data: trabajadera ?? null, error: null };
    },
  };

  const asignaciones: RepositorioAsignaciones = {
    listarPorTrabajadera: async (trabajaderaId) => ({
      data: almacen.asignaciones.filter(
        (asignacion) => asignacion.trabajadera_id === trabajaderaId,
      ),
      error: null,
    }),
    listarPorCostalero: async (costaleroId) => ({
      data: almacen.asignaciones.filter(
        (asignacion) => asignacion.costalero_id === costaleroId,
      ),
      error: null,
    }),
    obtener: async (clave) => ({
      data:
        almacen.asignaciones.find(
          (asignacion) =>
            asignacion.trabajadera_id === clave.trabajaderaId &&
            asignacion.costalero_id === clave.costaleroId,
        ) ?? null,
      error: null,
    }),
    crear: async (entrada) => {
      const asignacion: Asignacion = {
        trabajadera_id: entrada.trabajadera_id,
        costalero_id: entrada.costalero_id,
        is_boquilla: entrada.is_boquilla ?? false,
      };
      almacen.asignaciones.push(asignacion);
      return { data: asignacion, error: null };
    },
    actualizar: async (clave, cambios) => {
      const asignacion = almacen.asignaciones.find(
        (candidate) =>
          candidate.trabajadera_id === clave.trabajaderaId &&
          candidate.costalero_id === clave.costaleroId,
      );
      if (!asignacion) {
        return { data: null, error: { message: "La asignación no existe" } };
      }
      if (cambios.is_boquilla !== undefined) {
        asignacion.is_boquilla = cambios.is_boquilla;
      }
      return { data: asignacion, error: null };
    },
    eliminar: async (clave) => {
      const indice = almacen.asignaciones.findIndex(
        (asignacion) =>
          asignacion.trabajadera_id === clave.trabajaderaId &&
          asignacion.costalero_id === clave.costaleroId,
      );
      if (indice < 0) {
        return { data: null, error: { message: "La asignación no existe" } };
      }
      const [asignacion] = almacen.asignaciones.splice(indice, 1);
      return { data: asignacion ?? null, error: null };
    },
  };

  const tramos: RepositorioTramos = {
    listarPorPaso: async (pasoId) => ({
      data: almacen.tramos
        .filter((tramo) => tramo.paso_id === pasoId)
        .sort((a, b) => a.ordinal - b.ordinal),
      error: null,
    }),
    obtenerPorId: async (id) => ({
      data: almacen.tramos.find((tramo) => tramo.id === id) ?? null,
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
      almacen.tramos.push(tramo);
      return { data: tramo, error: null };
    },
    actualizar: async (id, cambios) => {
      const tramo = almacen.tramos.find((candidate) => candidate.id === id);
      if (!tramo) {
        return { data: null, error: { message: "El tramo no existe" } };
      }
      Object.assign(tramo, cambios);
      return { data: tramo, error: null };
    },
    eliminar: async (id) => {
      const indice = almacen.tramos.findIndex((tramo) => tramo.id === id);
      if (indice < 0) {
        return { data: null, error: { message: "El tramo no existe" } };
      }
      const [tramo] = almacen.tramos.splice(indice, 1);
      return { data: tramo ?? null, error: null };
    },
    reordenar: async (pasoId, orden) => {
      const delPaso = almacen.tramos.filter(
        (tramo) => tramo.paso_id === pasoId,
      );
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
        tramo.kind =
          indice === 0
            ? "salida"
            : indice === orden.length - 1
              ? "entrada"
              : "normal";
      }
      const ordenados = [...delPaso].sort((a, b) => a.ordinal - b.ordinal);
      return { data: ordenados, error: null };
    },
  };

  const costaleros: RepositorioCostaleros = {
    listarPorCuadrilla: async (cuadrillaId, filtro = {}) => ({
      data: almacen.costaleros.filter(
        (costalero) =>
          costalero.cuadrilla_id === cuadrillaId &&
          (filtro.active === undefined || costalero.active === filtro.active),
      ),
      error: null,
    }),
    obtenerPorId: async (id) => ({
      data: almacen.costaleros.find((costalero) => costalero.id === id) ?? null,
      error: null,
    }),
    crear: async (entrada) => {
      const nuevo: Costalero = {
        id: idNuevo(),
        profile_id: null,
        nickname: null,
        phone: null,
        notes: null,
        active: true,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        ...entrada,
      };
      almacen.costaleros.push(nuevo);
      return { data: nuevo, error: null };
    },
    actualizar: async (id, cambios) => {
      const costalero = almacen.costaleros.find(
        (candidate) => candidate.id === id,
      );
      if (!costalero) {
        return { data: null, error: { message: "El costalero no existe" } };
      }
      Object.assign(costalero, cambios);
      return { data: costalero, error: null };
    },
    eliminar: async (id) => {
      const indice = almacen.costaleros.findIndex(
        (costalero) => costalero.id === id,
      );
      if (indice < 0) {
        return { data: null, error: { message: "El costalero no existe" } };
      }
      const [costalero] = almacen.costaleros.splice(indice, 1);
      return { data: costalero ?? null, error: null };
    },
  };

  return { pasos, trabajaderas, asignaciones, tramos, costaleros };
}

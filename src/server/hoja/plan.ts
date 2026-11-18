/**
 * Lectura del plan de relevos para la hoja del capataz (P6) y para la
 * exportación (P7).
 *
 * Es el módulo que traduce lo que hay guardado en la base de datos a las
 * tablas que el capataz imprime: una hoja por trabajadera con los puestos de
 * §6 y, en cada tramo, quién ocupa cada puesto. Las dos salidas (la hoja y los
 * CSV) salen de la **misma** lectura, así que el papel y el archivo no pueden
 * contradecirse.
 *
 * El plan se lee con `leerPlanDeLaBase`, que lo reconstruye con las filas de
 * `relevos` y lo vuelve a verificar (S-5): si el plan guardado ya no encaja
 * con el paso, no se imprime.
 */

import {
  LADOS_POR_POSICION,
  NOMBRES_PUESTOS_POR_TIPO,
  tipoDeTrabajadera,
  type LadoPuesto,
  type TipoTrabajadera,
} from "@/domain/glosario";
import type { TipoTramo } from "@/domain/modelo";
import type { FilaDeDescansos, FilaDeRelevo } from "@/lib/export/csv";
import { crearRepositorioAsignaciones } from "@/server/repos/asignaciones";
import { crearRepositorioCostaleros } from "@/server/repos/costaleros";
import { crearRepositorioCuadrillas } from "@/server/repos/cuadrillas";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { crearRepositorioPlanes } from "@/server/repos/planes";
import { crearRepositorioTrabajaderas } from "@/server/repos/trabajaderas";
import { crearRepositorioTramos } from "@/server/repos/tramos";
import { leerPlanDeLaBase } from "@/server/plan/lectura";
import type { SupabaseClientLike } from "@/server/supabase/types";

/** Un puesto de la trabajadera (§6), de izquierda a derecha. */
export type PuestoDeHoja = {
  /** Posición del puesto, empezando en 0 por la izquierda. */
  indice: number;
  /** Nombre canónico: "patero izquierdo", "corriente"… */
  nombre: string;
  /** Lado del paso que ocupa. */
  lado: LadoPuesto;
};

/** La persona que ocupa un puesto en un tramo. */
export type PersonaEnPuesto = {
  costaleroId: string;
  nombre: string;
  /** Nombre del puesto que ocupa (§6). */
  puesto: string;
};

/** Una fila de la hoja: un tramo del recorrido. */
export type FilaDeHoja = {
  tramoId: string;
  /** Nombre del tramo. */
  tramo: string;
  ordinal: number;
  tipo: TipoTramo;
  /** La persona de cada puesto; `null` si ese puesto queda vacío. */
  personas: Array<PersonaEnPuesto | null>;
};

/** Una hoja: una trabajadera del paso. */
export type HojaDeTrabajadera = {
  id: string;
  /** Posición en el paso (1..N). */
  position: number;
  /** Tipo de la trabajadera (§6): primera, intermedia o última. */
  tipo: TipoTrabajadera;
  /** Puestos de izquierda a derecha. */
  puestos: PuestoDeHoja[];
  /** Filas: un tramo por fila, en orden de recorrido. */
  filas: FilaDeHoja[];
};

/** Todo lo que la hoja y los CSV necesitan del plan. */
export type PlanParaHoja = {
  paso: {
    id: string;
    nombre: string;
    anio: number;
    /** Nombre de la cuadrilla. */
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
  /** Una fila por (tramo, costalero): el CSV de relevos. */
  filas: FilaDeRelevo[];
  /** Una fila por costalero: el CSV de descansos. */
  descansos: FilaDeDescansos[];
};

/** Resultado de leer el plan para la hoja. */
export type ResultadoPlanParaHoja =
  { ok: true; datos: PlanParaHoja } | { ok: false; error: string };

/** Resultado de leer el plan para la hoja o la exportación, con permisos. */
export type ResultadoPlanParaExportar =
  | { ok: true; datos: PlanParaHoja }
  | {
      ok: false;
      tipo: "no_encontrado" | "sin_permiso" | "error";
      error: string;
    };

/**
 * Lee el plan para la hoja o la exportación comprobando quién lo pide.
 *
 * Sólo el capataz dueño de la cuadrilla del paso puede imprimir la hoja y
 * exportar el plan. Un plan que no existe responde `no_encontrado` y uno
 * ajeno `sin_permiso`: en los dos casos no se filtra nada más.
 */
export async function leerPlanParaExportar(
  cliente: SupabaseClientLike,
  planId: string,
  usuarioId: string,
): Promise<ResultadoPlanParaExportar> {
  const planes = crearRepositorioPlanes(cliente);
  const fila = await planes.obtenerPorId(planId);
  if (fila.error) {
    return { ok: false, tipo: "error", error: fila.error.message };
  }
  if (!fila.data) {
    return { ok: false, tipo: "no_encontrado", error: "El plan no existe." };
  }

  const pasos = crearRepositorioPasos(cliente);
  const paso = await pasos.obtenerPorId(fila.data.paso_id);
  if (!paso.data) {
    return { ok: false, tipo: "no_encontrado", error: "El plan no existe." };
  }
  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const cuadrilla = await cuadrillas.obtenerPorId(paso.data.cuadrilla_id);
  if (cuadrilla.data?.owner_id !== usuarioId) {
    return {
      ok: false,
      tipo: "sin_permiso",
      error: "No tienes permisos para exportar los planes de este paso.",
    };
  }

  const lectura = await leerPlanParaHoja(cliente, planId);
  if (!lectura.ok) {
    return { ok: false, tipo: "error", error: lectura.error };
  }
  return { ok: true, datos: lectura.datos };
}

/**
 * Lee el plan guardado y monta las hojas y las filas de la exportación.
 */
export async function leerPlanParaHoja(
  cliente: SupabaseClientLike,
  planId: string,
): Promise<ResultadoPlanParaHoja> {
  const planes = crearRepositorioPlanes(cliente);
  const fila = await planes.obtenerPorId(planId);
  if (fila.error) return { ok: false, error: fila.error.message };
  if (!fila.data) return { ok: false, error: "El plan no existe." };

  const lectura = await leerPlanDeLaBase(cliente, planId);
  if (!lectura.ok) return { ok: false, error: lectura.error };
  if (!lectura.cumple) {
    return {
      ok: false,
      error:
        "El plan guardado ya no encaja con la configuración del paso: hay que calcular uno nuevo.",
    };
  }
  const plan = lectura.leido.plan;

  const pasos = crearRepositorioPasos(cliente);
  const pasoResultado = await pasos.obtenerPorId(fila.data.paso_id);
  if (pasoResultado.error) {
    return { ok: false, error: pasoResultado.error.message };
  }
  if (!pasoResultado.data) return { ok: false, error: "El paso no existe." };
  const paso = pasoResultado.data;

  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const cuadrilla = await cuadrillas.obtenerPorId(paso.cuadrilla_id);
  if (cuadrilla.error) return { ok: false, error: cuadrilla.error.message };

  const trabajaderas = crearRepositorioTrabajaderas(cliente);
  const listaTrabajaderas = await trabajaderas.listarPorPaso(paso.id);
  if (listaTrabajaderas.error) {
    return { ok: false, error: listaTrabajaderas.error.message };
  }

  const asignaciones = crearRepositorioAsignaciones(cliente);
  const tramos = crearRepositorioTramos(cliente);
  const listaTramos = await tramos.listarPorPaso(paso.id);
  if (listaTramos.error) return { ok: false, error: listaTramos.error.message };

  const costaleros = crearRepositorioCostaleros(cliente);
  const listaCostaleros = await costaleros.listarPorCuadrilla(
    paso.cuadrilla_id,
    { active: true },
  );
  if (listaCostaleros.error) {
    return { ok: false, error: listaCostaleros.error.message };
  }
  const nombrePorCostalero = new Map(
    listaCostaleros.data.map((costalero) => [
      costalero.id,
      costalero.full_name,
    ]),
  );

  const asignacionesPorTrabajadera = await Promise.all(
    listaTrabajaderas.data.map((trabajadera) =>
      asignaciones.listarPorTrabajadera(trabajadera.id),
    ),
  );
  if (asignacionesPorTrabajadera.some((resultado) => resultado.error)) {
    return {
      ok: false,
      error: "No se han podido cargar las asignaciones del paso.",
    };
  }

  const total = listaTrabajaderas.data.length;
  const hojas: HojaDeTrabajadera[] = [];
  const filas: FilaDeRelevo[] = [];

  for (const [indice, trabajadera] of listaTrabajaderas.data.entries()) {
    const tipo = tipoDeTrabajadera(trabajadera.position, total);
    const nombres = NOMBRES_PUESTOS_POR_TIPO[tipo];
    const puestos: PuestoDeHoja[] = nombres.map((nombre, indicePuesto) => ({
      indice: indicePuesto,
      nombre,
      lado: LADOS_POR_POSICION[indicePuesto] ?? "centro",
    }));

    const pool = (asignacionesPorTrabajadera[indice]?.data ?? [])
      .map((asignacion) => asignacion.costalero_id)
      .sort((a, b) =>
        (nombrePorCostalero.get(a) ?? "").localeCompare(
          nombrePorCostalero.get(b) ?? "",
          "es",
        ),
      );
    const nombreDeLaTrabajadera = `Trabajadera ${String(trabajadera.position)}`;

    const filasDeHoja: FilaDeHoja[] = [];
    for (const tramo of listaTramos.data) {
      const reparto = plan.porTrabajadera[tramo.id]?.[trabajadera.id];
      const enPaso = reparto?.enPaso ?? [];
      const descansan = reparto?.descansan ?? [];

      // Los que van en el paso ocupan los puestos de izquierda a derecha; el
      // puesto lo decide el plan, no la app (P-6).
      const personas: Array<PersonaEnPuesto | null> = puestos.map((puesto) => {
        const costaleroId = enPaso[puesto.indice];
        if (costaleroId === undefined) return null;
        return {
          costaleroId,
          nombre: nombrePorCostalero.get(costaleroId) ?? costaleroId,
          puesto: puesto.nombre,
        };
      });

      filasDeHoja.push({
        tramoId: tramo.id,
        tramo: tramo.name,
        ordinal: tramo.ordinal,
        tipo: tramo.kind,
        personas,
      });

      // Las filas del CSV: una por (tramo, costalero del pool).
      for (const costaleroId of pool) {
        const estado = descansan.includes(costaleroId) ? "descanso" : "en_paso";
        const puesto =
          estado === "en_paso"
            ? (personas.find((persona) => persona?.costaleroId === costaleroId)
                ?.puesto ?? "")
            : "";
        filas.push({
          tramo: tramo.name,
          ordinal: tramo.ordinal,
          tipo: tramo.kind,
          costalero: nombrePorCostalero.get(costaleroId) ?? costaleroId,
          estado,
          puesto,
          trabajadera: nombreDeLaTrabajadera,
        });
      }
    }

    hojas.push({
      id: trabajadera.id,
      position: trabajadera.position,
      tipo,
      puestos,
      filas: filasDeHoja,
    });
  }

  // Los descansos por costalero: los tramos en los que no va en el paso.
  const porPersona = new Map<string, string[]>();
  for (const fila of filas) {
    if (fila.estado !== "descanso") continue;
    const lista = porPersona.get(fila.costalero) ?? [];
    lista.push(fila.tramo);
    porPersona.set(fila.costalero, lista);
  }
  const descansos: FilaDeDescansos[] = [...porPersona.entries()]
    .map(([costalero, tramos]) => ({
      costalero,
      descansaEn: tramos.join(", "),
      total: tramos.length,
    }))
    .sort((a, b) => a.costalero.localeCompare(b.costalero, "es"));

  return {
    ok: true,
    datos: {
      paso: {
        id: paso.id,
        nombre: paso.name,
        anio: paso.season,
        cuadrilla: cuadrilla.data?.name ?? "",
      },
      plan: {
        id: fila.data.id,
        version: fila.data.version,
        status: fila.data.status,
        seed: fila.data.seed,
        created_at: fila.data.created_at,
      },
      hojas,
      filas,
      descansos,
    },
  };
}

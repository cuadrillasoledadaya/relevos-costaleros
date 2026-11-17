"use server";

/**
 * Server actions del paso (P3, §9): crear y actualizar el paso, repartir los
 * costaleros por trabajadera, fijar las boquillas y guardar los tramos
 * propuestos.
 *
 * Reglas que se validan aquí (el servidor es la autoridad):
 * - S-7: un costalero pertenece a **un** pool (§16.1).
 * - F-4: `pool >= carga + 1` en toda trabajadera (§7.4).
 * - F-5: las 2 boquillas son costaleros **distintos** del paso (§7.4).
 * - §6: la carga va de 1 a 5 y el número de trabajaderas de 1 a 12.
 *
 * Las precondiciones F-1..F-6 no se recalculan aquí: las evalúa
 * `evaluarFactibilidad` de `src/domain/factibilidad.ts` (W2).
 */

import { revalidatePath } from "next/cache";

import { CARGA_DEFECTO, NUMERO_BOQUILLAS } from "@/domain/glosario";
import { array, numero, objeto, texto, type SchemaError } from "@/lib/schemas";
import {
  crearRepositorioAsignaciones,
  type Asignacion,
  type RepositorioAsignaciones,
} from "@/server/repos/asignaciones";
import {
  crearRepositorioCostaleros,
  type RepositorioCostaleros,
} from "@/server/repos/costaleros";
import {
  crearRepositorioPasos,
  type RepositorioPasos,
} from "@/server/repos/pasos";
import {
  crearRepositorioTrabajaderas,
  type RepositorioTrabajaderas,
} from "@/server/repos/trabajaderas";
import {
  crearRepositorioTramos,
  type RepositorioTramos,
} from "@/server/repos/tramos";
import { createServerSupabaseClient } from "@/server/supabase/server";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

/** Resultado de una mutación: mensaje para la UI o error en español. */
export type ResultadoAccion<T = undefined> =
  { ok: true; mensaje: string; datos: T } | { ok: false; error: string };

/** Repositorios que usan las acciones del paso. */
export type RepositoriosPaso = {
  pasos: RepositorioPasos;
  trabajaderas: RepositorioTrabajaderas;
  asignaciones: RepositorioAsignaciones;
  tramos: RepositorioTramos;
  costaleros: RepositorioCostaleros;
};

/** Reparto pedido para una trabajadera: sus costaleros y su carga. */
export type RepartoTrabajadera = {
  /** Id de la trabajadera. */
  trabajaderaId: string;
  /** Ids de los costaleros del pool. */
  costaleros: string[];
  /** Carga de la trabajadera (1..5). */
  carga: number;
};

/* -------------------------------------------------------------------------- */
/* Validación (schemas de `src/lib/schemas.ts`, W1)                            */
/* -------------------------------------------------------------------------- */

const crearPasoSchema = objeto({
  cuadrillaId: texto({ uuid: true }),
  nombre: texto({ min: 1 }),
  anio: numero({ integer: true }),
  numTrabajaderas: numero({ integer: true, min: 1, max: 12 }),
});

const guardarDatosPasoSchema = objeto({
  pasoId: texto({ uuid: true }),
  nombre: texto({ min: 1 }),
  anio: numero({ integer: true }),
  numTrabajaderas: numero({ integer: true, min: 1, max: 12 }),
});

const guardarRepartoSchema = objeto({
  pasoId: texto({ uuid: true }),
  reparto: array(
    objeto({
      trabajaderaId: texto({ uuid: true }),
      costaleros: array(texto({ uuid: true })),
      carga: numero({ integer: true, min: 1, max: 5 }),
    }),
  ),
});

const fijarBoquillasSchema = objeto({
  pasoId: texto({ uuid: true }),
  boquillas: array(texto({ uuid: true })),
});

const guardarTramosSchema = objeto({
  pasoId: texto({ uuid: true }),
  nombres: array(texto({ min: 1 })),
});

/* -------------------------------------------------------------------------- */
/* Utilidades internas                                                          */
/* -------------------------------------------------------------------------- */

/** Une los mensajes de validación de los schemas de W1. */
function mensajeDeValidacion(error: SchemaError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

/** Revalida una ruta; fuera de una petición (tests) no hace nada. */
function revalidarRuta(ruta: string): void {
  try {
    revalidatePath(ruta);
  } catch {
    // `revalidatePath` solo tiene efecto dentro de una petición de Next.js.
  }
}

/** Repositorios con la sesión del capataz (RLS decide qué se ve). */
async function obtenerRepositorios(): Promise<RepositoriosPaso> {
  const cliente = await createServerSupabaseClient();
  return {
    pasos: crearRepositorioPasos(cliente),
    trabajaderas: crearRepositorioTrabajaderas(cliente),
    asignaciones: crearRepositorioAsignaciones(cliente),
    tramos: crearRepositorioTramos(cliente),
    costaleros: crearRepositorioCostaleros(cliente),
  };
}

/** Asignaciones de todas las trabajaderas de un paso. */
async function asignacionesDelPaso(
  repos: RepositoriosPaso,
  trabajaderas: Array<{ id: string }>,
): Promise<{ data: Asignacion[]; error: string | null }> {
  const todas: Asignacion[] = [];
  for (const trabajadera of trabajaderas) {
    const resultado = await repos.asignaciones.listarPorTrabajadera(
      trabajadera.id,
    );
    if (resultado.error) {
      return { data: [], error: resultado.error.message };
    }
    todas.push(...resultado.data);
  }
  return { data: todas, error: null };
}

/* -------------------------------------------------------------------------- */
/* Acciones                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Crea un paso con sus trabajaderas (una por posición, con la carga por
 * defecto de §6). Devuelve el id del paso creado para navegar a su wizard.
 */
export async function crearPaso(
  entrada: {
    cuadrillaId: string;
    nombre: string;
    anio: number;
    numTrabajaderas: number;
  },
  repos?: RepositoriosPaso,
): Promise<ResultadoAccion<{ pasoId: string }>> {
  const validacion = crearPasoSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const datos = validacion.data;
  const repositorios = repos ?? (await obtenerRepositorios());

  const paso = await repositorios.pasos.crear({
    cuadrilla_id: datos.cuadrillaId,
    name: datos.nombre,
    season: datos.anio,
    num_trabajaderas: datos.numTrabajaderas,
  });
  if (paso.error || !paso.data) {
    return {
      ok: false,
      error: paso.error?.message ?? "No se ha podido crear el paso.",
    };
  }

  for (let position = 1; position <= datos.numTrabajaderas; position += 1) {
    const trabajadera = await repositorios.trabajaderas.crear({
      paso_id: paso.data.id,
      position,
      carga: CARGA_DEFECTO,
    });
    if (trabajadera.error) {
      return {
        ok: false,
        error:
          trabajadera.error.message ??
          `No se ha podido crear la trabajadera ${String(position)}.`,
      };
    }
  }

  revalidarRuta(
    `/cuadrillas/${datos.cuadrillaId}/paso/${paso.data.id}/configuracion`,
  );
  return {
    ok: true,
    mensaje: `Paso «${paso.data.name}» creado con ${String(datos.numTrabajaderas)} trabajaderas.`,
    datos: { pasoId: paso.data.id },
  };
}

/**
 * Guarda los datos del paso (nombre, año y nº de trabajaderas) y
 * reconcilia las trabajaderas: crea las que faltan y elimina las que
 * sobran. Avisa de los puestos que quedan sin cubrir (§6, P-3).
 */
export async function guardarDatosPaso(
  entrada: {
    pasoId: string;
    nombre: string;
    anio: number;
    numTrabajaderas: number;
  },
  repos?: RepositoriosPaso,
): Promise<ResultadoAccion<{ numTrabajaderas: number }>> {
  const validacion = guardarDatosPasoSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const datos = validacion.data;
  const repositorios = repos ?? (await obtenerRepositorios());

  const paso = await repositorios.pasos.actualizar(datos.pasoId, {
    name: datos.nombre,
    season: datos.anio,
    num_trabajaderas: datos.numTrabajaderas,
  });
  if (paso.error || !paso.data) {
    return {
      ok: false,
      error: paso.error?.message ?? "No se ha podido guardar el paso.",
    };
  }

  const existentes = await repositorios.trabajaderas.listarPorPaso(
    datos.pasoId,
  );
  if (existentes.error) {
    return { ok: false, error: existentes.error.message };
  }
  const posicionesExistentes = new Set(
    existentes.data.map((trabajadera) => trabajadera.position),
  );

  const creadas: number[] = [];
  for (let position = 1; position <= datos.numTrabajaderas; position += 1) {
    if (posicionesExistentes.has(position)) continue;
    const creada = await repositorios.trabajaderas.crear({
      paso_id: datos.pasoId,
      position,
      carga: CARGA_DEFECTO,
    });
    if (creada.error) {
      return {
        ok: false,
        error:
          creada.error.message ??
          `No se ha podido crear la trabajadera ${String(position)}.`,
      };
    }
    creadas.push(position);
  }

  const eliminadas: number[] = [];
  for (const trabajadera of existentes.data) {
    if (trabajadera.position <= datos.numTrabajaderas) continue;
    const eliminada = await repositorios.trabajaderas.eliminar(trabajadera.id);
    if (eliminada.error) {
      return {
        ok: false,
        error:
          eliminada.error.message ??
          `No se ha podido eliminar la trabajadera ${String(trabajadera.position)}.`,
      };
    }
    eliminadas.push(trabajadera.position);
  }

  const avisos: string[] = [];
  const finales = await repositorios.trabajaderas.listarPorPaso(datos.pasoId);
  if (finales.error) {
    return { ok: false, error: finales.error.message };
  }
  for (const trabajadera of finales.data) {
    const asignaciones = await repositorios.asignaciones.listarPorTrabajadera(
      trabajadera.id,
    );
    if (asignaciones.error) {
      return { ok: false, error: asignaciones.error.message };
    }
    const pool = asignaciones.data.length;
    if (pool < trabajadera.carga) {
      avisos.push(
        `La trabajadera ${String(trabajadera.position)} tiene ${String(pool)} costaleros: quedan ${String(trabajadera.carga - pool)} puestos sin cubrir.`,
      );
    }
  }

  const partes: string[] = ["Paso guardado."];
  if (creadas.length > 0) {
    partes.push(
      `Se han creado ${String(creadas.length)} trabajaderas sin costaleros asignados.`,
    );
  }
  if (eliminadas.length > 0) {
    partes.push(
      `Se han eliminado ${String(eliminadas.length)} trabajaderas y sus costaleros han quedado sin asignar.`,
    );
  }
  partes.push(...avisos);

  revalidarRuta(
    `/cuadrillas/${paso.data.cuadrilla_id}/paso/${datos.pasoId}/configuracion`,
  );
  return {
    ok: true,
    mensaje: partes.join(" "),
    datos: { numTrabajaderas: datos.numTrabajaderas },
  };
}

/**
 * Guarda el reparto de costaleros por trabajadera y la carga de cada una.
 *
 * Rechaza el reparto entero (sin persistir nada) si un costalero aparece en
 * dos pools (S-7) o si algún costalero no es de la cuadrilla.
 */
export async function guardarReparto(
  entrada: {
    pasoId: string;
    reparto: RepartoTrabajadera[];
  },
  repos?: RepositoriosPaso,
): Promise<ResultadoAccion<{ asignados: number }>> {
  const validacion = guardarRepartoSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const datos = validacion.data;
  const repositorios = repos ?? (await obtenerRepositorios());

  const paso = await repositorios.pasos.obtenerPorId(datos.pasoId);
  if (paso.error || !paso.data) {
    return {
      ok: false,
      error: paso.error?.message ?? "El paso no existe.",
    };
  }

  const trabajaderas = await repositorios.trabajaderas.listarPorPaso(
    datos.pasoId,
  );
  if (trabajaderas.error) {
    return { ok: false, error: trabajaderas.error.message };
  }
  const idsTrabajaderas = new Set(
    trabajaderas.data.map((trabajadera) => trabajadera.id),
  );
  for (const item of datos.reparto) {
    if (!idsTrabajaderas.has(item.trabajaderaId)) {
      return {
        ok: false,
        error: "Una de las trabajaderas no pertenece a este paso.",
      };
    }
  }

  const costaleros = await repositorios.costaleros.listarPorCuadrilla(
    paso.data.cuadrilla_id,
  );
  if (costaleros.error) {
    return { ok: false, error: costaleros.error.message };
  }
  const nombrePorCostalero = new Map(
    costaleros.data.map((costalero) => [costalero.id, costalero.full_name]),
  );
  const idsCostaleros = new Set(nombrePorCostalero.keys());

  // S-7: un costalero en un solo pool. Se comprueba ANTES de escribir nada.
  const trabajaderaDe = new Map<string, string>();
  const nombreTrabajadera = new Map(
    trabajaderas.data.map((trabajadera) => [
      trabajadera.id,
      String(trabajadera.position),
    ]),
  );
  for (const item of datos.reparto) {
    for (const costaleroId of item.costaleros) {
      if (!idsCostaleros.has(costaleroId)) {
        return {
          ok: false,
          error: "Uno de los costaleros no pertenece a la cuadrilla.",
        };
      }
      const previa = trabajaderaDe.get(costaleroId);
      if (previa !== undefined) {
        return {
          ok: false,
          error: `El costalero ${nombrePorCostalero.get(costaleroId) ?? costaleroId} ya está en la trabajadera ${nombreTrabajadera.get(previa) ?? previa}: un costalero solo puede estar en un pool.`,
        };
      }
      trabajaderaDe.set(costaleroId, item.trabajaderaId);
    }
  }

  // Boquillas actuales: se conservan aunque el costalero cambie de pool.
  const asignacionesActuales = await asignacionesDelPaso(
    repositorios,
    trabajaderas.data,
  );
  if (asignacionesActuales.error) {
    return { ok: false, error: asignacionesActuales.error };
  }

  // Una trabajadera que no viene en la petición conserva lo que tenga:
  // si uno de sus costaleros se pide para otra, se quedaría en dos pools.
  const trabajaderasPedidas = new Set(
    datos.reparto.map((item) => item.trabajaderaId),
  );
  for (const asignacion of asignacionesActuales.data) {
    if (trabajaderasPedidas.has(asignacion.trabajadera_id)) continue;
    const item = datos.reparto.find((candidato) =>
      candidato.costaleros.includes(asignacion.costalero_id),
    );
    if (!item) continue;
    return {
      ok: false,
      error: `El costalero ${nombrePorCostalero.get(asignacion.costalero_id) ?? asignacion.costalero_id} ya está en la trabajadera ${nombreTrabajadera.get(asignacion.trabajadera_id) ?? asignacion.trabajadera_id}: un costalero solo puede estar en un pool.`,
    };
  }

  const boquillasActuales = new Set(
    asignacionesActuales.data
      .filter((asignacion) => asignacion.is_boquilla)
      .map((asignacion) => asignacion.costalero_id),
  );

  let asignados = 0;
  for (const item of datos.reparto) {
    const actuales = await repositorios.asignaciones.listarPorTrabajadera(
      item.trabajaderaId,
    );
    if (actuales.error) {
      return { ok: false, error: actuales.error.message };
    }
    const deseados = new Set(item.costaleros);
    const actualesIds = new Set(
      actuales.data.map((asignacion) => asignacion.costalero_id),
    );

    for (const asignacion of actuales.data) {
      if (deseados.has(asignacion.costalero_id)) continue;
      const eliminada = await repositorios.asignaciones.eliminar({
        trabajaderaId: asignacion.trabajadera_id,
        costaleroId: asignacion.costalero_id,
      });
      if (eliminada.error) {
        return { ok: false, error: eliminada.error.message };
      }
    }

    for (const costaleroId of item.costaleros) {
      if (actualesIds.has(costaleroId)) continue;
      const creada = await repositorios.asignaciones.crear({
        trabajadera_id: item.trabajaderaId,
        costalero_id: costaleroId,
        is_boquilla: boquillasActuales.has(costaleroId),
      });
      if (creada.error) {
        return { ok: false, error: creada.error.message };
      }
      asignados += 1;
    }

    const trabajadera = trabajaderas.data.find(
      (candidate) => candidate.id === item.trabajaderaId,
    );
    if (trabajadera && trabajadera.carga !== item.carga) {
      const actualizada = await repositorios.trabajaderas.actualizar(
        item.trabajaderaId,
        { carga: item.carga },
      );
      if (actualizada.error) {
        return { ok: false, error: actualizada.error.message };
      }
    }
  }

  revalidarRuta(
    `/cuadrillas/${paso.data.cuadrilla_id}/paso/${datos.pasoId}/configuracion`,
  );
  return {
    ok: true,
    mensaje: `Reparto guardado: ${String(asignados)} costaleros asignados.`,
    datos: { asignados },
  };
}

/**
 * Fija las 2 boquillas del paso (F-5): tiene que ser costaleros distintos y
 * del paso (asignados a alguna trabajadera).
 */
export async function fijarBoquillas(
  entrada: { pasoId: string; boquillas: string[] },
  repos?: RepositoriosPaso,
): Promise<ResultadoAccion<{ boquillas: number }>> {
  const validacion = fijarBoquillasSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const datos = validacion.data;
  const repositorios = repos ?? (await obtenerRepositorios());

  if (datos.boquillas.length !== NUMERO_BOQUILLAS) {
    return {
      ok: false,
      error: "Hay que elegir las 2 boquillas del paso.",
    };
  }
  if (new Set(datos.boquillas).size !== NUMERO_BOQUILLAS) {
    return {
      ok: false,
      error: "Las 2 boquillas tienen que ser costaleros distintos.",
    };
  }

  const trabajaderas = await repositorios.trabajaderas.listarPorPaso(
    datos.pasoId,
  );
  if (trabajaderas.error) {
    return { ok: false, error: trabajaderas.error.message };
  }
  const asignaciones = await asignacionesDelPaso(
    repositorios,
    trabajaderas.data,
  );
  if (asignaciones.error) {
    return { ok: false, error: asignaciones.error };
  }
  const costalerosDelPaso = new Set(
    asignaciones.data.map((asignacion) => asignacion.costalero_id),
  );
  for (const boquilla of datos.boquillas) {
    if (!costalerosDelPaso.has(boquilla)) {
      return {
        ok: false,
        error: "Las boquillas tienen que ser costaleros del paso.",
      };
    }
  }

  const deseadas = new Set(datos.boquillas);
  for (const asignacion of asignaciones.data) {
    const debeSerBoquilla = deseadas.has(asignacion.costalero_id);
    if (asignacion.is_boquilla === debeSerBoquilla) continue;
    const actualizada = await repositorios.asignaciones.actualizar(
      {
        trabajaderaId: asignacion.trabajadera_id,
        costaleroId: asignacion.costalero_id,
      },
      { is_boquilla: debeSerBoquilla },
    );
    if (actualizada.error) {
      return { ok: false, error: actualizada.error.message };
    }
  }

  revalidarRuta(`/cuadrillas/.../paso/${datos.pasoId}/configuracion`);
  return {
    ok: true,
    mensaje: "Boquillas guardadas.",
    datos: { boquillas: datos.boquillas.length },
  };
}

/**
 * Guarda los tramos propuestos en el paso 5 del wizard.
 *
 * Crea los tramos que faltan (el primero es `salida` y el último `entrada`,
 * §8.3) y renombra los que ya existen. **No borra** los que quedan fuera de
 * la propuesta: eliminarlos es cosa del apartado de tramos (W6).
 */
export async function guardarTramos(
  entrada: { pasoId: string; nombres: string[] },
  repos?: RepositoriosPaso,
): Promise<ResultadoAccion<{ guardados: number }>> {
  const validacion = guardarTramosSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const datos = validacion.data;
  const repositorios = repos ?? (await obtenerRepositorios());

  const existentes = await repositorios.tramos.listarPorPaso(datos.pasoId);
  if (existentes.error) {
    return { ok: false, error: existentes.error.message };
  }
  const porOrdinal = new Map(
    existentes.data.map((tramo) => [tramo.ordinal, tramo]),
  );

  let guardados = 0;
  let creados = 0;
  const total = datos.nombres.length;
  for (const [indice, nombre] of datos.nombres.entries()) {
    const ordinal = indice + 1;
    const existente = porOrdinal.get(ordinal);
    if (existente) {
      if (existente.name === nombre) continue;
      const actualizado = await repositorios.tramos.actualizar(existente.id, {
        name: nombre,
      });
      if (actualizado.error) {
        return { ok: false, error: actualizado.error.message };
      }
      guardados += 1;
      continue;
    }
    const kind =
      ordinal === 1 ? "salida" : ordinal === total ? "entrada" : "normal";
    const creado = await repositorios.tramos.crear({
      paso_id: datos.pasoId,
      name: nombre,
      ordinal,
      kind,
    });
    if (creado.error) {
      return { ok: false, error: creado.error.message };
    }
    guardados += 1;
    creados += 1;
  }

  const partes: string[] = [
    `Guardados ${String(guardados)} tramos del recorrido.`,
  ];
  if (creados > 0) {
    partes.push(
      `Se han creado ${String(creados)} tramos nuevos (el primero es la salida y el último la entrada).`,
    );
  }
  if (existentes.data.length > total) {
    partes.push(
      "Los tramos que ya estaban guardados y no están en la propuesta no se borran: se quitan en el apartado de tramos.",
    );
  }

  revalidarRuta(`/cuadrillas/.../paso/${datos.pasoId}/configuracion`);
  return {
    ok: true,
    mensaje: partes.join(" "),
    datos: { guardados },
  };
}

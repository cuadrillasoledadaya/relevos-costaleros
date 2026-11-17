"use server";

/**
 * Server actions del apartado de tramos (P4, §9).
 *
 * El capataz crea, renombra, reordena y borra los tramos del recorrido. Las
 * acciones son la autoridad: validan la entrada y devuelven el recorrido ya
 * normalizado (ordinales 1..N sin huecos ni repetidos y tipos canónicos).
 *
 * Los cambios de estructura del recorrido (alta, baja y reordenación) los hace
 * la base de datos en una sola transacción (`anexar_tramo`, `borrar_tramo` y
 * `reordenar_tramos`): o se aplican enteros, o no se aplican. Así el recorrido
 * nunca queda a medias con ordinales repetidos o con huecos.
 */

import { revalidatePath } from "next/cache";

import { avisosDeCoherencia, type AvisoTramo } from "@/domain/tramos";
import {
  array,
  enumeracion,
  objeto,
  texto,
  type SchemaError,
} from "@/lib/schemas";
import {
  crearRepositorioTramos,
  type RepositorioTramos,
  type Tramo,
} from "@/server/repos/tramos";
import { createServerSupabaseClient } from "@/server/supabase/server";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

/** Resultado de una mutación: mensaje para la UI o error en español. */
export type ResultadoAccionTramos<T = undefined> =
  { ok: true; mensaje: string; datos: T } | { ok: false; error: string };

/** El recorrido ya normalizado y los avisos de coherencia de sus tipos. */
export type DatosTramos = {
  tramos: Tramo[];
  avisos: AvisoTramo[];
};

/* -------------------------------------------------------------------------- */
/* Validación                                                                  */
/* -------------------------------------------------------------------------- */

const crearTramoSchema = objeto({
  pasoId: texto({ uuid: true }),
  nombre: texto({ min: 1 }),
});

const renombrarTramoSchema = objeto({
  pasoId: texto({ uuid: true }),
  tramoId: texto({ uuid: true }),
  nombre: texto({ min: 1 }),
});

const reordenarTramosSchema = objeto({
  pasoId: texto({ uuid: true }),
  orden: array(texto({ uuid: true })),
});

const eliminarTramoSchema = objeto({
  pasoId: texto({ uuid: true }),
  tramoId: texto({ uuid: true }),
});

const cambiarTipoTramoSchema = objeto({
  pasoId: texto({ uuid: true }),
  tramoId: texto({ uuid: true }),
  tipo: enumeracion(["salida", "normal", "entrada"]),
});

/* -------------------------------------------------------------------------- */
/* Utilidades internas                                                          */
/* -------------------------------------------------------------------------- */

/** Une los mensajes de validación de los schemas de W1. */
function mensajeDeValidacion(error: SchemaError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

/** Repositorio de tramos con la sesión del capataz (RLS decide qué se ve). */
async function obtenerRepositorio(): Promise<RepositorioTramos> {
  const cliente = await createServerSupabaseClient();
  return crearRepositorioTramos(cliente);
}

/** Revalida la pantalla de tramos; fuera de una petición (tests) no hace nada. */
function revalidarPantallaTramos(): void {
  try {
    revalidatePath("/cuadrillas/[cuadrillaId]/paso/[pasoId]/tramos", "page");
  } catch {
    // `revalidatePath` sólo tiene efecto dentro de una petición de Next.js.
  }
}

/** Normaliza la lista del recorrido y calcula los avisos de coherencia. */
function datosDeTramos(tramos: Tramo[]): DatosTramos {
  const ordenados = [...tramos].sort((a, b) => a.ordinal - b.ordinal);
  return { tramos: ordenados, avisos: avisosDeCoherencia(ordenados) };
}

/**
 * Comprueba que el tramo existe y que es del paso pedido. Devuelve el error
 * en español si no lo es.
 */
async function comprobarTramoDelPaso(
  repos: RepositorioTramos,
  pasoId: string,
  tramoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resultado = await repos.obtenerPorId(tramoId);
  if (resultado.error) {
    return { ok: false, error: resultado.error.message };
  }
  if (!resultado.data) {
    return { ok: false, error: "El tramo no existe." };
  }
  if (resultado.data.paso_id !== pasoId) {
    return { ok: false, error: "El tramo no pertenece a este paso." };
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Acciones                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Añade un tramo al final del recorrido (§8.3). El alta y el recálculo de los
 * tipos (el primero es la salida y el último la entrada) ocurren en la misma
 * transacción.
 */
export async function crearTramo(
  entrada: { pasoId: string; nombre: string },
  repos?: RepositorioTramos,
): Promise<ResultadoAccionTramos<DatosTramos>> {
  const nombre = (entrada.nombre ?? "").trim();
  if (nombre === "") {
    return { ok: false, error: "El nombre del tramo no puede estar vacío." };
  }
  const validacion = crearTramoSchema.safeParse({ ...entrada, nombre });
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const repositorios = repos ?? (await obtenerRepositorio());

  const resultado = await repositorios.anexar(
    validacion.data.pasoId,
    validacion.data.nombre,
  );
  if (resultado.error) {
    return { ok: false, error: resultado.error.message };
  }

  revalidarPantallaTramos();
  return {
    ok: true,
    mensaje: `Tramo «${validacion.data.nombre}» añadido al recorrido.`,
    datos: datosDeTramos(resultado.data),
  };
}

/**
 * Renombra un tramo del recorrido. No toca su ordinal ni su tipo.
 */
export async function renombrarTramo(
  entrada: { pasoId: string; tramoId: string; nombre: string },
  repos?: RepositorioTramos,
): Promise<ResultadoAccionTramos<DatosTramos>> {
  const nombre = (entrada.nombre ?? "").trim();
  if (nombre === "") {
    return { ok: false, error: "El nombre del tramo no puede estar vacío." };
  }
  const validacion = renombrarTramoSchema.safeParse({
    ...entrada,
    nombre,
  });
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const repositorios = repos ?? (await obtenerRepositorio());

  const pertenencia = await comprobarTramoDelPaso(
    repositorios,
    validacion.data.pasoId,
    validacion.data.tramoId,
  );
  if (!pertenencia.ok) {
    return { ok: false, error: pertenencia.error };
  }

  const actualizado = await repositorios.actualizar(validacion.data.tramoId, {
    name: validacion.data.nombre,
  });
  if (actualizado.error) {
    return { ok: false, error: actualizado.error.message };
  }

  const listado = await repositorios.listarPorPaso(validacion.data.pasoId);
  if (listado.error) {
    return { ok: false, error: listado.error.message };
  }

  revalidarPantallaTramos();
  return {
    ok: true,
    mensaje: `Tramo «${validacion.data.nombre}» renombrado.`,
    datos: datosDeTramos(listado.data),
  };
}

/**
 * Cambia el orden del recorrido. Los ids en `orden` son el recorrido nuevo: la
 * base de datos los renumera 1..N en una sola transacción, sin huecos ni
 * ordinales repetidos, y recalcula los tipos canónicos.
 */
export async function reordenarTramos(
  entrada: { pasoId: string; orden: string[] },
  repos?: RepositorioTramos,
): Promise<ResultadoAccionTramos<DatosTramos>> {
  const validacion = reordenarTramosSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const repositorios = repos ?? (await obtenerRepositorio());

  const ids = validacion.data.orden;
  if (ids.length === 0) {
    return {
      ok: false,
      error: "El recorrido no puede quedarse sin tramos.",
    };
  }
  if (new Set(ids).size !== ids.length) {
    return {
      ok: false,
      error: "El orden del recorrido tiene el mismo tramo dos veces.",
    };
  }

  const resultado = await repositorios.reordenar(validacion.data.pasoId, ids);
  if (resultado.error) {
    return { ok: false, error: resultado.error.message };
  }
  if (resultado.data.length !== ids.length) {
    return {
      ok: false,
      error: "El orden no coincide con los tramos guardados del recorrido.",
    };
  }

  revalidarPantallaTramos();
  return {
    ok: true,
    mensaje: "Recorrido reordenado.",
    datos: datosDeTramos(resultado.data),
  };
}

/**
 * Borra un tramo del recorrido. La base de datos borra y renumera en la misma
 * transacción: los tramos que quedan siguen con ordinales 1..N-1 y el último
 * vuelve a ser la entrada.
 */
export async function eliminarTramo(
  entrada: { pasoId: string; tramoId: string },
  repos?: RepositorioTramos,
): Promise<ResultadoAccionTramos<DatosTramos>> {
  const validacion = eliminarTramoSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const repositorios = repos ?? (await obtenerRepositorio());

  const pertenencia = await comprobarTramoDelPaso(
    repositorios,
    validacion.data.pasoId,
    validacion.data.tramoId,
  );
  if (!pertenencia.ok) {
    return { ok: false, error: pertenencia.error };
  }

  const resultado = await repositorios.eliminar(validacion.data.tramoId);
  if (resultado.error) {
    return { ok: false, error: resultado.error.message };
  }

  revalidarPantallaTramos();
  return {
    ok: true,
    mensaje: "Tramo borrado del recorrido.",
    datos: datosDeTramos(resultado.data),
  };
}

/**
 * Cambia el tipo de un tramo (salida, normal o entrada). El capataz puede
 * dejar el recorrido incoherente a propósito: la acción devuelve los avisos
 * que lo dicen.
 */
export async function cambiarTipoTramo(
  entrada: {
    pasoId: string;
    tramoId: string;
    tipo: "salida" | "normal" | "entrada";
  },
  repos?: RepositorioTramos,
): Promise<ResultadoAccionTramos<DatosTramos>> {
  const validacion = cambiarTipoTramoSchema.safeParse(entrada);
  if (!validacion.success) {
    return { ok: false, error: mensajeDeValidacion(validacion.error) };
  }
  const repositorios = repos ?? (await obtenerRepositorio());

  const pertenencia = await comprobarTramoDelPaso(
    repositorios,
    validacion.data.pasoId,
    validacion.data.tramoId,
  );
  if (!pertenencia.ok) {
    return { ok: false, error: pertenencia.error };
  }

  const actualizado = await repositorios.actualizar(validacion.data.tramoId, {
    kind: validacion.data.tipo,
  });
  if (actualizado.error) {
    return { ok: false, error: actualizado.error.message };
  }

  const listado = await repositorios.listarPorPaso(validacion.data.pasoId);
  if (listado.error) {
    return { ok: false, error: listado.error.message };
  }

  revalidarPantallaTramos();
  const datos = datosDeTramos(listado.data);
  const parte =
    datos.avisos.length > 0 ? " Revisa los avisos del recorrido." : "";
  return {
    ok: true,
    mensaje: `Tipo del tramo cambiado a «${validacion.data.tipo}».${parte}`,
    datos,
  };
}

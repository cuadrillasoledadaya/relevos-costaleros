/**
 * Entrada del solver leída de la base de datos (§11.1) y comprobación de
 * propiedad del paso.
 *
 * El servidor es la autoridad (§13.3): el plan se calcula siempre con lo que
 * hay guardado en la base de datos, no con lo que dice el navegador. Este
 * módulo solo lee y ordena de forma determinista: el pool de cada
 * trabajadera sale de sus asignaciones, ordenado por el nombre del costalero
 * (`localeCompare` con `"es"`), para que la misma base de datos produzca
 * siempre la misma entrada y, con ella, el mismo plan.
 */

import type { RelevoPlanInput } from "@/domain/modelo";
import { crearRepositorioAsignaciones } from "@/server/repos/asignaciones";
import { crearRepositorioCostaleros } from "@/server/repos/costaleros";
import { crearRepositorioCuadrillas } from "@/server/repos/cuadrillas";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { crearRepositorioTrabajaderas } from "@/server/repos/trabajaderas";
import { crearRepositorioTramos } from "@/server/repos/tramos";
import type { SupabaseClientLike } from "@/server/supabase/types";

/** Resultado de construir la entrada del solver para un paso. */
export type ResultadoEntradaPlan =
  { ok: true; entrada: RelevoPlanInput } | { ok: false; error: string };

/**
 * Construye la entrada del solver (§11.1) con lo que hay guardado del paso:
 * sus trabajaderas con su carga y su pool, sus tramos ordenados y las dos
 * boquillas del paso.
 */
export async function construirEntradaDelPlan(
  cliente: SupabaseClientLike,
  pasoId: string,
): Promise<ResultadoEntradaPlan> {
  const pasos = crearRepositorioPasos(cliente);
  const paso = await pasos.obtenerPorId(pasoId);
  if (paso.error) return { ok: false, error: paso.error.message };
  if (!paso.data) return { ok: false, error: "El paso no existe." };

  const trabajaderas = crearRepositorioTrabajaderas(cliente);
  const listaTrabajadoras = await trabajaderas.listarPorPaso(pasoId);
  if (listaTrabajadoras.error) {
    return { ok: false, error: listaTrabajadoras.error.message };
  }

  const asignaciones = crearRepositorioAsignaciones(cliente);
  const tramos = crearRepositorioTramos(cliente);
  const costaleros = crearRepositorioCostaleros(cliente);

  const listaCostaleros = await costaleros.listarPorCuadrilla(
    paso.data.cuadrilla_id,
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

  const listaTramos = await tramos.listarPorPaso(pasoId);
  if (listaTramos.error) {
    return { ok: false, error: listaTramos.error.message };
  }

  const pools = new Map<string, string[]>();
  const boquillas: string[] = [];

  for (const trabajadera of listaTrabajadoras.data) {
    const asignadas = await asignaciones.listarPorTrabajadera(trabajadera.id);
    if (asignadas.error) {
      return { ok: false, error: asignadas.error.message };
    }
    const ids = asignadas.data.map((asignacion) => asignacion.costalero_id);
    ids.sort((a, b) =>
      (nombrePorCostalero.get(a) ?? "").localeCompare(
        nombrePorCostalero.get(b) ?? "",
        "es",
      ),
    );
    pools.set(trabajadera.id, ids);
    for (const asignacion of asignadas.data) {
      if (!asignacion.is_boquilla) continue;
      if (!boquillas.includes(asignacion.costalero_id)) {
        boquillas.push(asignacion.costalero_id);
      }
    }
  }

  const entrada: RelevoPlanInput = {
    pasoId,
    trabajaderas: listaTrabajadoras.data.map((trabajadera) => ({
      id: trabajadera.id,
      position: trabajadera.position,
      carga: trabajadera.carga,
      pool: pools.get(trabajadera.id) ?? [],
    })),
    tramos: listaTramos.data.map((tramo) => ({
      id: tramo.id,
      name: tramo.name,
      ordinal: tramo.ordinal,
      kind: tramo.kind,
    })),
    boquillas,
  };

  return { ok: true, entrada };
}

/**
 * `true` si el usuario de la sesión es el capataz dueño de la cuadrilla del
 * paso.
 *
 * Un paso que no se puede leer (no existe o la RLS de §10 no lo deja ver) es
 * como si no existiera: la respuesta es `false` y no se filtra su existencia.
 */
export async function esCapatazDelPaso(
  cliente: SupabaseClientLike,
  pasoId: string,
  usuarioId: string,
): Promise<boolean> {
  const pasos = crearRepositorioPasos(cliente);
  const paso = await pasos.obtenerPorId(pasoId);
  if (!paso.data) return false;

  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const cuadrilla = await cuadrillas.obtenerPorId(paso.data.cuadrilla_id);
  return cuadrilla.data?.owner_id === usuarioId;
}

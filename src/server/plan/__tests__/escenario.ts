/**
 * Escenario de prueba del plan de relevos: un paso con una trabajadera de
 * tres costaleros (los dos de la cuadrilla y uno sin cuenta) y seis tramos.
 *
 * El pool es de 3 con carga 2, así que descansa uno por tramo (F-1..F-6 se
 * cumplen con T = 6) y las dos boquillas son dos costaleros distintos del
 * paso (F-5).
 */

import type { PGlite } from "@electric-sql/pglite";

import { IDS, crearFixturesBasicos } from "../../repos/__tests__/fixtures";

/** Tercer costalero de la cuadrilla A: lo da de alta el capataz, sin cuenta. */
export const COSTALERO_C = "90000000-0000-4000-8000-0000000000a1";

/** Paso sin suplentes: su única trabajadera no puede relevar nunca (F-1). */
export const PASO_SIN_SUPLENTES = "30000000-0000-4000-8000-0000000000a1";
export const TRABAJADORA_SIN_SUPLENTES = "50000000-0000-4000-8000-0000000000a1";

/** Número de tramos del recorrido de prueba. */
export const TRAMOS = 6;

/** Id del tramo `n` del recorrido de prueba. */
export function idTramo(ordinal: number, pasoId: string = IDS.pasoA): string {
  const prefijo = pasoId === IDS.pasoA ? "60000000" : "61000000";
  return `${prefijo}-0000-4000-8000-0000000000${String(ordinal).padStart(2, "0")}`;
}

/** Prepara el paso de prueba: una trabajadera con 3 costaleros y 6 tramos. */
export async function prepararPaso(db: PGlite): Promise<void> {
  await crearFixturesBasicos(db);

  await db.query(
    `insert into public.costaleros (id, cuadrilla_id, full_name)
     values ($1, $2, 'Costalero C')`,
    [COSTALERO_C, IDS.cuadrillaA],
  );
  await db.query(
    `insert into public.trabajaderas (id, paso_id, position, carga)
     values ($1, $2, 1, 2)`,
    [IDS.trabajaderaA, IDS.pasoA],
  );
  await db.query(
    `insert into public.asignaciones (trabajadera_id, costalero_id, is_boquilla)
     values ($1, $2, true), ($1, $3, true), ($1, $4, false)`,
    [IDS.trabajaderaA, IDS.filaCostaleroA, IDS.filaCostaleroB, COSTALERO_C],
  );

  await prepararTramos(db, IDS.pasoA);
}

/** Prepara un paso sin suplentes: su plan es imposible (F-1). */
export async function prepararPasoImposible(db: PGlite): Promise<void> {
  await db.query(
    `insert into public.pasos (id, cuadrilla_id, name, season, num_trabajaderas)
     values ($1, $2, 'Paso imposible', 2025, 1)`,
    [PASO_SIN_SUPLENTES, IDS.cuadrillaA],
  );
  await db.query(
    `insert into public.trabajaderas (id, paso_id, position, carga)
     values ($1, $2, 1, 2)`,
    [TRABAJADORA_SIN_SUPLENTES, PASO_SIN_SUPLENTES],
  );
  await db.query(
    `insert into public.asignaciones (trabajadera_id, costalero_id, is_boquilla)
     values ($1, $2, false)`,
    [TRABAJADORA_SIN_SUPLENTES, COSTALERO_C],
  );

  await prepararTramos(db, PASO_SIN_SUPLENTES);
}

/** Inserta el recorrido de `TRAMOS` tramos del paso dado. */
async function prepararTramos(db: PGlite, pasoId: string): Promise<void> {
  for (let ordinal = 1; ordinal <= TRAMOS; ordinal += 1) {
    const kind =
      ordinal === 1 ? "salida" : ordinal === TRAMOS ? "entrada" : "normal";
    await db.query(
      `insert into public.tramos (id, paso_id, name, ordinal, kind)
       values ($1, $2, $3, $4, $5)`,
      [
        idTramo(ordinal, pasoId),
        pasoId,
        `Tramo ${String(ordinal)}`,
        ordinal,
        kind,
      ],
    );
  }
}

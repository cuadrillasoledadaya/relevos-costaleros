/**
 * Tests del servicio del plan de relevos (`src/server/plan/servicio.ts`) contra
 * la base de datos real de PGlite: las mismas migraciones del repositorio,
 * con la RLS de §10 puesta.
 *
 * Lo que se comprueba aquí es lo que el contrato de §12 promete:
 * - el plan se calcula, se guarda con su versión y el historial lo lista;
 * - el plan **leído de la base de datos** vuelve a pasar `verificarPlan` (S-5):
 *   no vale un plan que solo existe en memoria;
 * - una versión nueva no pisa la anterior;
 * - publicar deja un solo plan publicado en el paso;
 * - un plan imposible no se guarda: es un diagnóstico con cifras (§11.4);
 * - otro capataz no opera con los planes de un paso ajeno.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import type {
  EstadoCostoalero,
  RelevoPlan,
  RelevoPlanInput,
} from "@/domain/modelo";
import { verificarPlan } from "@/domain/solver";
import { crearRepositorioPlanes, type Plan } from "@/server/repos/planes";
import { crearRepositorioRelevos, type Relevo } from "@/server/repos/relevos";
import type { SupabaseClientLike } from "@/server/supabase/types";

import { IDS, crearFixturesBasicos } from "../../repos/__tests__/fixtures";
import { crearClientePglite } from "../../repos/__tests__/pglite-client";
import {
  crearPgliteDePrueba,
  establecerActor,
  restaurarRol,
} from "../../repos/__tests__/pglite";
import { construirEntradaDelPlan } from "../entrada";
import { crearServicioPlan } from "../servicio";

/** Tercer costalero de la cuadrilla A: lo da de alta el capataz, sin cuenta. */
const COSTALERO_C = "90000000-0000-4000-8000-0000000000a1";

/** Paso sin suplentes: su única trabajadera no puede relevar nunca (F-1). */
const PASO_SIN_SUPLENTES = "30000000-0000-4000-8000-0000000000a1";
const TRABAJADORA_SIN_SUPLENTES = "50000000-0000-4000-8000-0000000000a1";

/** Número de tramos del recorrido de prueba. */
const TRAMOS = 6;

/** Id del tramo `n` del recorrido de prueba. */
function idTramo(ordinal: number): string {
  return `60000000-0000-4000-8000-0000000000${String(ordinal).padStart(2, "0")}`;
}

/** Prepara el paso de prueba: una trabajadera con 3 costaleros y 6 tramos. */
async function prepararPaso(db: PGlite): Promise<void> {
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

  for (let ordinal = 1; ordinal <= TRAMOS; ordinal += 1) {
    const kind =
      ordinal === 1 ? "salida" : ordinal === TRAMOS ? "entrada" : "normal";
    await db.query(
      `insert into public.tramos (id, paso_id, name, ordinal, kind)
       values ($1, $2, $3, $4, $5)`,
      [idTramo(ordinal), IDS.pasoA, `Tramo ${String(ordinal)}`, ordinal, kind],
    );
  }
}

/** Prepara un paso sin suplentes: su plan es imposible (F-1). */
async function prepararPasoImposible(db: PGlite): Promise<void> {
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
  for (let ordinal = 1; ordinal <= TRAMOS; ordinal += 1) {
    const kind =
      ordinal === 1 ? "salida" : ordinal === TRAMOS ? "entrada" : "normal";
    await db.query(
      `insert into public.tramos (id, paso_id, name, ordinal, kind)
       values ($1, $2, $3, $4, $5)`,
      [
        `61000000-0000-4000-8000-0000000000${String(ordinal).padStart(2, "0")}`,
        PASO_SIN_SUPLENTES,
        `Tramo ${String(ordinal)}`,
        ordinal,
        kind,
      ],
    );
  }
}

/**
 * Reconstruye el plan con lo que hay **guardado en la base de datos**: los
 * estados salen de las filas de `relevos` y el reparto por trabajadera se
 * vuelve a componer con los pools de la entrada.
 */
function planDesdeLaBase(
  plan: Plan,
  relevos: Relevo[],
  entrada: RelevoPlanInput,
): RelevoPlan {
  const estados: Record<string, Record<string, EstadoCostoalero>> = {};
  for (const tramo of entrada.tramos) {
    estados[tramo.id] = {};
  }
  for (const relevo of relevos) {
    const delTramo = estados[relevo.tramo_id];
    if (!delTramo) continue;
    delTramo[relevo.costalero_id] = relevo.estado;
  }

  const porTrabajadera: RelevoPlan["porTrabajadera"] = {};
  for (const tramo of entrada.tramos) {
    const porLinea: Record<string, { enPaso: string[]; descansan: string[] }> =
      {};
    for (const trabajadera of entrada.trabajaderas) {
      const enPaso: string[] = [];
      const descansan: string[] = [];
      for (const costalero of trabajadera.pool) {
        const estado = estados[tramo.id]?.[costalero];
        if (estado === "descanso") descansan.push(costalero);
        if (estado === "en_paso") enPaso.push(costalero);
      }
      porLinea[trabajadera.id] = { enPaso, descansan };
    }
    porTrabajadera[tramo.id] = porLinea;
  }

  return {
    pasoId: plan.paso_id,
    seed: plan.seed,
    solverVersion: plan.solver_version,
    estados,
    porTrabajadera,
  };
}

describe("servicio del plan de relevos", () => {
  let db: PGlite;
  let client: SupabaseClientLike;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await prepararPaso(db);
    await establecerActor(db, "authenticated", IDS.capatazA);
    client = crearClientePglite(db);
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("guarda el plan calculado como primera versión del paso", async () => {
    const servicio = crearServicioPlan(client);

    const resultado = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok)
      throw new Error(
        `El plan no se ha calculado: ${JSON.stringify(resultado)}`,
      );
    expect(resultado.version).toBe(1);
    expect(resultado.planId).toBeTruthy();
    expect(resultado.stats.cumplimiento.r1).toBe(true);
  }, 30_000);

  it("el plan leído de la base de datos vuelve a pasar verificarPlan", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok)
      throw new Error(`El plan no se ha calculado: ${JSON.stringify(calculo)}`);

    // Se lee de la base, no de la memoria del cálculo.
    const planes = crearRepositorioPlanes(client);
    const guardados = await planes.obtenerPorId(calculo.planId);
    if (!guardados.data)
      throw new Error("El plan no está en la base de datos.");
    const relevos = await crearRepositorioRelevos(client).listarPorPlan(
      calculo.planId,
    );
    const entrada = await construirEntradaDelPlan(client, IDS.pasoA);
    if (!entrada.ok)
      throw new Error(
        `No se ha podido leer el paso: ${JSON.stringify(entrada)}`,
      );

    expect(relevos.data).toHaveLength(TRAMOS * 3);

    const stats = verificarPlan(
      planDesdeLaBase(guardados.data, relevos.data, entrada.entrada),
      entrada.entrada,
    );
    expect(stats.cumplimiento.r1).toBe(true);
    expect(stats.cumplimiento.r2).toBe(true);
    expect(stats.cumplimiento.r3).toBe(true);
    expect(stats.cumplimiento.r4).toBe(true);
  }, 30_000);

  it("una versión nueva no pisa la anterior y el historial las lista separadas", async () => {
    const servicio = crearServicioPlan(client);

    const primero = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!primero.ok)
      throw new Error(`El plan no se ha calculado: ${JSON.stringify(primero)}`);
    const segundo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA, seed: 20250331 },
      IDS.capatazA,
    );
    if (!segundo.ok)
      throw new Error(`El plan no se ha calculado: ${JSON.stringify(segundo)}`);

    expect(segundo.version).toBe(2);
    expect(segundo.planId).not.toBe(primero.planId);

    const historial = await servicio.listarHistorial(IDS.pasoA, IDS.capatazA);
    if (!historial.ok)
      throw new Error(
        `El historial no se ha podido leer: ${JSON.stringify(historial)}`,
      );
    expect(historial.planes.map((plan) => plan.version)).toEqual([2, 1]);
    expect(historial.planes.map((plan) => plan.seed)).toEqual([
      20250331, 20250330,
    ]);
  }, 30_000);

  it("publicar deja un solo plan publicado en el paso", async () => {
    const servicio = crearServicioPlan(client);
    const primero = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!primero.ok)
      throw new Error(`El plan no se ha calculado: ${JSON.stringify(primero)}`);
    const segundo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!segundo.ok)
      throw new Error(`El plan no se ha calculado: ${JSON.stringify(segundo)}`);

    const publicado = await servicio.publicar(primero.planId, IDS.capatazA);
    expect(publicado.ok).toBe(true);
    let historial = await servicio.listarHistorial(IDS.pasoA, IDS.capatazA);
    if (!historial.ok)
      throw new Error(
        `El historial no se ha podido leer: ${JSON.stringify(historial)}`,
      );
    expect(
      historial.planes.find((plan) => plan.id === primero.planId)?.status,
    ).toBe("publicado");
    expect(
      historial.planes.find((plan) => plan.id === segundo.planId)?.status,
    ).toBe("borrador");

    // Publicar el otro vuelve a borrador el primero: un paso, un plan publicado.
    const republicado = await servicio.publicar(segundo.planId, IDS.capatazA);
    expect(republicado.ok).toBe(true);
    historial = await servicio.listarHistorial(IDS.pasoA, IDS.capatazA);
    if (!historial.ok)
      throw new Error(
        `El historial no se ha podido leer: ${JSON.stringify(historial)}`,
      );
    expect(
      historial.planes.filter((plan) => plan.status === "publicado"),
    ).toHaveLength(1);
    expect(
      historial.planes.find((plan) => plan.id === segundo.planId)?.status,
    ).toBe("publicado");
    expect(
      historial.planes.find((plan) => plan.id === primero.planId)?.status,
    ).toBe("borrador");
  }, 30_000);

  it("un plan imposible devuelve el diagnóstico y no guarda nada", async () => {
    await prepararPasoImposible(db);
    const servicio = crearServicioPlan(client);

    const resultado = await servicio.calcularYGuardar(
      { pasoId: PASO_SIN_SUPLENTES },
      IDS.capatazA,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("El plan no debería haberse calculado.");
    expect(resultado.tipo).toBe("infeasible");
    if (resultado.tipo !== "infeasible") {
      throw new Error("El resultado no es un diagnóstico.");
    }
    expect(resultado.diagnostico.codigo).toBe("SIN_SUPLENTES");
    expect(resultado.diagnostico.mensaje).toContain("suplentes");
    expect(resultado.diagnostico.sugerencia).not.toBe("");

    await restaurarRol(db);
    const planes = await db.query<{ total: string }>(
      `select count(*)::text as total from public.planes where paso_id = $1`,
      [PASO_SIN_SUPLENTES],
    );
    expect(planes.rows[0]?.total).toBe("0");
  }, 30_000);

  it("otro capataz no calcula ni publica los planes de un paso ajeno", async () => {
    const servicio = crearServicioPlan(client);
    const delDueno = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!delDueno.ok)
      throw new Error(
        `El plan no se ha calculado: ${JSON.stringify(delDueno)}`,
      );

    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazB,
    );
    expect(calculo.ok).toBe(false);
    if (calculo.ok) throw new Error("El plan no debería haberse calculado.");
    expect(calculo.tipo).toBe("sin_permiso");

    const historial = await servicio.listarHistorial(IDS.pasoA, IDS.capatazB);
    expect(historial.ok).toBe(false);
    if (historial.ok) throw new Error("El historial no debería haberse leído.");
    expect(historial.tipo).toBe("sin_permiso");

    const publicacion = await servicio.publicar(delDueno.planId, IDS.capatazB);
    expect(publicacion.ok).toBe(false);
    if (publicacion.ok)
      throw new Error("El plan no debería haberse publicado.");
    expect(publicacion.tipo).toBe("sin_permiso");
  }, 30_000);
});

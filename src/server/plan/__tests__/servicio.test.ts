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

import type { PlanStats } from "@/domain/modelo";
import { solvePlanDeRelevos, verificarPlan } from "@/domain/solver";
import { crearRepositorioPlanes } from "@/server/repos/planes";
import { crearRepositorioRelevos } from "@/server/repos/relevos";
import type { SupabaseClientLike } from "@/server/supabase/types";

import { IDS } from "../../repos/__tests__/fixtures";
import { crearClientePglite } from "../../repos/__tests__/pglite-client";
import {
  crearPgliteDePrueba,
  establecerActor,
  restaurarRol,
} from "../../repos/__tests__/pglite";
import {
  PASO_SIN_SUPLENTES,
  TRAMOS,
  prepararPaso,
  prepararPasoImposible,
} from "./escenario";
import { construirEntradaDelPlan } from "../entrada";
import { reconstruirPlanDesdeRelevos } from "../lectura";
import { crearServicioPlan } from "../servicio";

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
      reconstruirPlanDesdeRelevos(
        guardados.data,
        relevos.data,
        entrada.entrada,
      ),
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

  it("probar varias semillas guarda la mejor según el orden de §8.2", async () => {
    const servicio = crearServicioPlan(client);
    const semillas = [20250330, 20250331, 20250332, 20250333];

    const resultado = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA, semillas },
      IDS.capatazA,
    );
    if (!resultado.ok) {
      throw new Error(
        `El plan no se ha calculado: ${JSON.stringify(resultado)}`,
      );
    }

    // El mejor según §8.2, calculado aquí con el solver real.
    const entrada = await construirEntradaDelPlan(client, IDS.pasoA);
    if (!entrada.ok) throw new Error("No se ha podido leer el paso.");
    const candidatos = semillas
      .map((seed) => solvePlanDeRelevos(entrada.entrada, { seed }))
      .filter((candidato) => candidato.ok);
    // En un empate se queda con la primera: el servicio hace lo mismo.
    const mejor = candidatos.reduce((a, b) =>
      esMejor(b.stats, a.stats) ? b : a,
    );

    const planes = crearRepositorioPlanes(client);
    const guardado = await planes.obtenerPorId(resultado.planId);
    expect(guardado.data?.seed).toBe(mejor.plan.seed);
    expect(semillas).toContain(guardado.data?.seed);
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

/**
 * El orden de §8.2, escrito aquí para el test: dispersión por pool, luego
 * global y luego solapamiento entre salida y entrada.
 */
function esMejor(primero: PlanStats, segundo: PlanStats): boolean {
  const suma = (stats: PlanStats): number =>
    Object.values(stats.dispercionPorTrabajadera).reduce(
      (total, valor) => total + valor,
      0,
    );
  const diferencia = suma(primero) - suma(segundo);
  if (diferencia !== 0) return diferencia < 0;
  if (primero.dispercionGlobal !== segundo.dispercionGlobal) {
    return primero.dispercionGlobal < segundo.dispercionGlobal;
  }
  return primero.solapamientoSalidaEntrada < segundo.solapamientoSalidaEntrada;
}

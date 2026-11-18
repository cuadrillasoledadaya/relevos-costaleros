/**
 * Tests de la lectura de un plan guardado (`src/server/plan/lectura.ts`).
 *
 * La pantalla P5 muestra el plan que hay en la base de datos, no el que
 * quedó en memoria al calcularlo: por eso el plan se reconstruye con las
 * filas de `relevos` y se vuelve a verificar con `verificarPlan` (S-5).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { crearServicioPlan } from "../servicio";
import { leerPlanDeLaBase } from "../lectura";
import { IDS } from "../../repos/__tests__/fixtures";
import { crearClientePglite } from "../../repos/__tests__/pglite-client";
import {
  crearPgliteDePrueba,
  establecerActor,
} from "../../repos/__tests__/pglite";
import { COSTALERO_C, prepararPaso } from "./escenario";

describe("lectura del plan guardado", () => {
  let db: PGlite;
  let client: ReturnType<typeof crearClientePglite>;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await prepararPaso(db);
    await establecerActor(db, "authenticated", IDS.capatazA);
    client = crearClientePglite(db);
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("lee el plan de la base de datos y lo da por bueno", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) {
      throw new Error(`El plan no se ha calculado: ${JSON.stringify(calculo)}`);
    }

    const lectura = await leerPlanDeLaBase(client, calculo.planId);

    expect(lectura.ok).toBe(true);
    if (!lectura.ok) throw new Error(lectura.error);
    expect(lectura.cumple).toBe(true);
    expect(lectura.leido.version).toBe(1);
    expect(lectura.leido.status).toBe("borrador");
    expect(lectura.leido.seed).toBe(20250330);
    expect(lectura.leido.stats.cumplimiento.r1).toBe(true);
    expect(lectura.leido.stats.cumplimiento.r4).toBe(true);
    // El plan leído tiene el estado de cada persona en cada tramo.
    expect(
      Object.keys(
        lectura.leido.plan.estados[
          Object.keys(lectura.leido.plan.estados)[0] ?? ""
        ] ?? {},
      ),
    ).toHaveLength(3);
  }, 30_000);

  it("avisa cuando el plan ya no encaja con la configuración actual del paso", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) {
      throw new Error(`El plan no se ha calculado: ${JSON.stringify(calculo)}`);
    }

    // Alguien saca a un costalero del pool: el plan guardado ya no encaja.
    await db.query(
      `delete from public.asignaciones
        where trabajadera_id = $1 and costalero_id = $2`,
      [IDS.trabajaderaA, COSTALERO_C],
    );

    const lectura = await leerPlanDeLaBase(client, calculo.planId);

    expect(lectura.ok).toBe(true);
    if (!lectura.ok) throw new Error(lectura.error);
    expect(lectura.cumple).toBe(false);
  }, 30_000);

  it("avisa de que el plan no existe", async () => {
    const lectura = await leerPlanDeLaBase(
      client,
      "70000000-0000-4000-8000-0000000000a1",
    );

    expect(lectura.ok).toBe(false);
    if (lectura.ok) return;
    expect(lectura.error).toBe("El plan no existe.");
  });
});

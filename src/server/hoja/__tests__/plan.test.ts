/**
 * Tests de la lectura del plan para la hoja y la exportación (§12).
 *
 * Van contra PGlite con las migraciones reales: el plan se calcula de verdad,
 * se guarda y se lee de la base, y lo que sale son las mismas filas que ve el
 * capataz en el papel y en el CSV.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { crearServicioPlan } from "@/server/plan/servicio";
import { leerPlanParaExportar, leerPlanParaHoja } from "@/server/hoja/plan";
import { IDS } from "../../repos/__tests__/fixtures";
import { crearClientePglite } from "../../repos/__tests__/pglite-client";
import {
  crearPgliteDePrueba,
  establecerActor,
} from "../../repos/__tests__/pglite";
import {
  COSTALERO_C,
  TRAMOS,
  prepararPaso,
} from "../../plan/__tests__/escenario";

describe("lectura del plan para la hoja", () => {
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

  it("monta una hoja por trabajadera con los puestos de §6", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) throw new Error("El plan no se ha calculado.");

    const lectura = await leerPlanParaHoja(client, calculo.planId);

    expect(lectura.ok).toBe(true);
    if (!lectura.ok) throw new Error(lectura.error);
    expect(lectura.datos.hojas).toHaveLength(1);
    const hoja = lectura.datos.hojas[0];
    expect(hoja?.tipo).toBe("primera");
    expect(hoja?.puestos.map((puesto) => puesto.nombre)).toEqual([
      "patero izquierdo",
      "fijador izquierdo",
      "corriente",
      "fijador derecho",
      "patero derecho",
    ]);
    expect(hoja?.filas).toHaveLength(TRAMOS);
    expect(hoja?.filas[0]?.tramo).toBe("Tramo 1");
    expect(hoja?.filas[0]?.tipo).toBe("salida");
    expect(hoja?.filas[TRAMOS - 1]?.tipo).toBe("entrada");
  }, 30_000);

  it("cada fila tiene el nombre del costalero de cada puesto", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) throw new Error("El plan no se ha calculado.");

    const lectura = await leerPlanParaHoja(client, calculo.planId);
    if (!lectura.ok) throw new Error(lectura.error);
    const hoja = lectura.datos.hojas[0];
    const fila = hoja?.filas[0];
    const personas = fila?.personas ?? [];

    // La carga es 2: dos personas en el paso y el resto de puestos vacíos.
    expect(personas.filter((persona) => persona !== null)).toHaveLength(2);
    const nombres = personas
      .filter((persona) => persona !== null)
      .map((persona) => persona?.nombre);
    // Quién descansa en el primer tramo lo decide el plan; lo que se comprueba
    // es que los nombres son los de la base y no los ids.
    for (const nombre of nombres) {
      expect(["Costalero A", "Costalero B", "Costalero C"]).toContain(nombre);
    }
    expect(nombres).not.toContain(IDS.filaCostaleroA);
    expect(nombres).not.toContain(COSTALERO_C);
  }, 30_000);

  it("el CSV tiene una fila por (tramo, costalero): pool × T", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) throw new Error("El plan no se ha calculado.");

    const lectura = await leerPlanParaHoja(client, calculo.planId);
    if (!lectura.ok) throw new Error(lectura.error);

    // El pool tiene 3 costaleros y el recorrido 6 tramos.
    expect(lectura.datos.filas).toHaveLength(3 * TRAMOS);
    const delPrimerTramo = lectura.datos.filas.filter(
      (fila) => fila.ordinal === 1,
    );
    expect(delPrimerTramo).toHaveLength(3);
    expect(
      delPrimerTramo.filter((fila) => fila.estado === "descanso"),
    ).toHaveLength(1);
    expect(
      delPrimerTramo.filter((fila) => fila.estado === "en_paso"),
    ).toHaveLength(2);
    // El que descansa no tiene puesto; los que van, sí.
    expect(
      delPrimerTramo.filter((fila) => fila.estado === "descanso")[0]?.puesto,
    ).toBe("");
    expect(
      delPrimerTramo.filter((fila) => fila.estado === "en_paso")[0]?.puesto,
    ).not.toBe("");
    expect(delPrimerTramo[0]?.trabajadera).toBe("Trabajadera 1");
  }, 30_000);

  it("los descansos por costalero cuadran con los del plan", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) throw new Error("El plan no se ha calculado.");

    const lectura = await leerPlanParaHoja(client, calculo.planId);
    if (!lectura.ok) throw new Error(lectura.error);

    // Cada costalero descansa al menos 2 veces (R2).
    expect(lectura.datos.descansos).toHaveLength(3);
    for (const fila of lectura.datos.descansos) {
      expect(fila.total).toBeGreaterThanOrEqual(2);
      expect(fila.descansaEn.split(", ")).toHaveLength(fila.total);
    }
    expect(lectura.datos.descansos.map((fila) => fila.costalero)).toContain(
      "Costalero C",
    );
  }, 30_000);

  it("sólo el capataz dueño puede leer la hoja para exportar", async () => {
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) throw new Error("El plan no se ha calculado.");

    const ajeno = await leerPlanParaExportar(
      client,
      calculo.planId,
      IDS.capatazB,
    );
    expect(ajeno.ok).toBe(false);
    if (ajeno.ok) return;
    expect(ajeno.tipo).toBe("sin_permiso");

    const inexistente = await leerPlanParaExportar(
      client,
      "70000000-0000-4000-8000-0000000000a1",
      IDS.capatazA,
    );
    expect(inexistente.ok).toBe(false);
    if (inexistente.ok) return;
    expect(inexistente.tipo).toBe("no_encontrado");

    const delDueno = await leerPlanParaExportar(
      client,
      calculo.planId,
      IDS.capatazA,
    );
    expect(delDueno.ok).toBe(true);
  }, 30_000);

  it("avisa si el costalero no tiene cuenta en el pool", async () => {
    // El tercer costalero del escenario no tiene cuenta: entra igual en el
    // pool (lo da de alta el capataz), pero la hoja lo enseña por su nombre.
    const servicio = crearServicioPlan(client);
    const calculo = await servicio.calcularYGuardar(
      { pasoId: IDS.pasoA },
      IDS.capatazA,
    );
    if (!calculo.ok) throw new Error("El plan no se ha calculado.");

    const lectura = await leerPlanParaHoja(client, calculo.planId);
    if (!lectura.ok) throw new Error(lectura.error);
    const nombres = lectura.datos.filas.map((fila) => fila.costalero);

    expect(nombres).toContain("Costalero C");
    expect(nombres).not.toContain(COSTALERO_C);
  }, 30_000);
});

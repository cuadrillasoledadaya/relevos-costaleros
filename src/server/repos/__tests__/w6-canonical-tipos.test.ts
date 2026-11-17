import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { IDS, crearFixturesBasicos } from "@/server/repos/__tests__/fixtures";
import {
  crearPgliteDePrueba,
  establecerActor,
  restaurarRol,
} from "@/server/repos/__tests__/pglite";
import { crearClientePglite } from "@/server/repos/__tests__/pglite-client";
import { crearRepositorioTramos } from "@/server/repos/tramos";

type Semilla = { name: string; kind: "salida" | "normal" | "entrada" };

/**
 * VERIFICACIÓN PROPIA del bloqueante 1: el alta debe dejar el recorrido con
 * los tipos canónicos (primero `salida`, último `entrada`) y, si la fase
 * final falla, no debe dejar ni un cambio.
 */
describe("bloqueante 1 · el alta recalcula los tipos canónicos", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await crearFixturesBasicos(db);
    await establecerActor(db, "authenticated", IDS.capatazA);
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  async function sembrar(semillas: Semilla[]): Promise<void> {
    const repos = crearRepositorioTramos(crearClientePglite(db));
    for (const [indice, semilla] of semillas.entries()) {
      const creado = await repos.crear({
        paso_id: IDS.pasoA,
        name: semilla.name,
        ordinal: indice + 1,
        kind: semilla.kind,
      });
      expect(creado.error).toBeNull();
    }
  }

  async function hashTramos(): Promise<string> {
    const salida = await db.query<{ h: string }>(
      `select coalesce(md5(string_agg(t::text, '|' order by t.ordinal)), '') as h
         from public.tramos t
        where t.paso_id = $1`,
      [IDS.pasoA],
    );
    return salida.rows[0]?.h ?? "";
  }

  async function tiposGuardados(): Promise<string[]> {
    const salida = await db.query<{ kind: string }>(
      `select kind from public.tramos where paso_id = $1 order by ordinal`,
      [IDS.pasoA],
    );
    return salida.rows.map((fila) => fila.kind);
  }

  it("deja salida, normal, normal y entrada con tipos NO canónicos de partida", async () => {
    await sembrar([
      { name: "Tramo 1", kind: "normal" },
      { name: "Tramo 2", kind: "normal" },
      { name: "Tramo 3", kind: "entrada" },
    ]);

    const repos = crearRepositorioTramos(crearClientePglite(db));
    const resultado = await repos.anexar(IDS.pasoA, "Vuelta a la plaza");

    expect(resultado.error).toBeNull();
    expect(resultado.data.map((tramo) => tramo.kind)).toEqual([
      "salida",
      "normal",
      "normal",
      "entrada",
    ]);
    expect(resultado.data.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3, 4]);
    expect(resultado.data.map((tramo) => tramo.name)).toEqual([
      "Tramo 1",
      "Tramo 2",
      "Tramo 3",
      "Vuelta a la plaza",
    ]);
    // Lo devuelto por la función es lo que queda guardado.
    expect(await tiposGuardados()).toEqual([
      "salida",
      "normal",
      "normal",
      "entrada",
    ]);
  });

  it("recalcula también con tipos invertidos a mano (entrada, salida, normal)", async () => {
    await sembrar([
      { name: "Tramo 1", kind: "entrada" },
      { name: "Tramo 2", kind: "salida" },
      { name: "Tramo 3", kind: "normal" },
    ]);

    const repos = crearRepositorioTramos(crearClientePglite(db));
    const resultado = await repos.anexar(IDS.pasoA, "Vuelta a la plaza");

    expect(resultado.error).toBeNull();
    expect(resultado.data.map((tramo) => tramo.kind)).toEqual([
      "salida",
      "normal",
      "normal",
      "entrada",
    ]);
  });

  it("deja salida y entrada cuando el paso tenía un solo tramo mal tipado", async () => {
    await sembrar([{ name: "Tramo 1", kind: "normal" }]);

    const repos = crearRepositorioTramos(crearClientePglite(db));
    const resultado = await repos.anexar(IDS.pasoA, "Vuelta a la plaza");

    expect(resultado.error).toBeNull();
    expect(resultado.data.map((tramo) => tramo.kind)).toEqual([
      "salida",
      "entrada",
    ]);
  });

  it("no deja ni una fila si la fase final de tipos falla", async () => {
    await sembrar([
      { name: "Tramo 1", kind: "normal" },
      { name: "Tramo 2", kind: "normal" },
      { name: "Tramo 3", kind: "entrada" },
    ]);

    const antes = await hashTramos();
    const totalAntes = await db.query<{ n: string }>(
      `select count(*)::text as n from public.tramos where paso_id = $1`,
      [IDS.pasoA],
    );

    await restaurarRol(db);
    await db.exec(`
      create function public.fallo_en_la_fase_de_tipos() returns trigger
      language plpgsql as $$
      begin
        raise exception 'Fallo inyectado en la fase de tipos.';
      end;
      $$;
      create trigger fallo_en_la_fase_de_tipos
      before update of kind on public.tramos
      for each row execute function public.fallo_en_la_fase_de_tipos();
    `);
    await establecerActor(db, "authenticated", IDS.capatazA);

    const repos = crearRepositorioTramos(crearClientePglite(db));
    const resultado = await repos.anexar(IDS.pasoA, "Vuelta a la plaza");

    expect(resultado.error).not.toBeNull();
    expect(resultado.error?.message).toContain(
      "Fallo inyectado en la fase de tipos",
    );
    await restaurarRol(db);
    const despues = await hashTramos();
    const totalDespues = await db.query<{ n: string }>(
      `select count(*)::text as n from public.tramos where paso_id = $1`,
      [IDS.pasoA],
    );
    expect(despues).toBe(antes);
    expect(totalDespues.rows[0]?.n).toBe(totalAntes.rows[0]?.n);
    expect(totalDespues.rows[0]?.n).toBe("3");
  });
});

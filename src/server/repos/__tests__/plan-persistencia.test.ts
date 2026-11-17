import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { crearRepositorioPlanes } from "../planes";
import { crearRepositorioRelevos } from "../relevos";
import { IDS, crearFixturesBasicos } from "./fixtures";
import { crearPgliteDePrueba, establecerActor, restaurarRol } from "./pglite";
import { crearClientePglite } from "./pglite-client";

const RELEVOS: Array<{
  tramoId: string;
  costaleroId: string;
  estado: "en_paso" | "descanso";
}> = [
  {
    tramoId: IDS.tramoA,
    costaleroId: IDS.filaCostaleroA,
    estado: "en_paso",
  },
  {
    tramoId: IDS.tramoA,
    costaleroId: IDS.filaCostaleroB,
    estado: "descanso",
  },
];

const STATS = {
  descansosPorCostalero: {
    [IDS.filaCostaleroA]: 1,
    [IDS.filaCostaleroB]: 1,
  },
  dispercionGlobal: 0,
};

function entrada() {
  return {
    seed: 20250330,
    solverVersion: "1.0.0",
    stats: STATS,
    relevos: RELEVOS,
  };
}

describe("persistencia atómica de planes de relevos", () => {
  let db: PGlite;
  let client: ReturnType<typeof crearClientePglite>;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await crearFixturesBasicos(db);
    await db.query(
      `insert into public.tramos (id, paso_id, name, ordinal, kind)
       values ($1, $2, 'Salida', 1, 'salida')`,
      [IDS.tramoA, IDS.pasoA],
    );
    await establecerActor(db, "authenticated", IDS.capatazA);
    client = crearClientePglite(db);
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("guarda la primera versión del paso como borrador creada por su capataz", async () => {
    const repos = crearRepositorioPlanes(client);

    const resultado = await repos.guardar(IDS.pasoA, entrada());

    expect(resultado.error).toBeNull();
    expect(resultado.data).toMatchObject({
      paso_id: IDS.pasoA,
      version: 1,
      status: "borrador",
      seed: 20250330,
      solver_version: "1.0.0",
      stats: STATS,
      created_by: IDS.capatazA,
    });
  });

  it("guarda una segunda versión sin tocar la primera y mantiene el historial separado", async () => {
    const repos = crearRepositorioPlanes(client);

    const primero = await repos.guardar(IDS.pasoA, entrada());
    expect(primero.error).toBeNull();
    const segundo = await repos.guardar(IDS.pasoA, {
      ...entrada(),
      seed: 20250331,
    });

    expect(segundo.error).toBeNull();
    expect(segundo.data?.version).toBe(2);
    expect(segundo.data?.id).not.toBe(primero.data?.id);

    const historial = await repos.listar({ pasoId: IDS.pasoA });
    expect(historial.error).toBeNull();
    expect(
      historial.data.map((plan) => ({ id: plan.id, version: plan.version })),
    ).toEqual([
      { id: segundo.data?.id, version: 2 },
      { id: primero.data?.id, version: 1 },
    ]);
    expect(
      historial.data.find((plan) => plan.id === primero.data?.id),
    ).toMatchObject({
      paso_id: IDS.pasoA,
      version: 1,
      status: "borrador",
      seed: 20250330,
      created_by: IDS.capatazA,
    });
  });

  it("guarda los relevos del plan y conserva su estado", async () => {
    const repos = crearRepositorioPlanes(client);
    const relevos = crearRepositorioRelevos(client);

    const resultado = await repos.guardar(IDS.pasoA, entrada());

    expect(resultado.error).toBeNull();
    const guardados = await relevos.listarPorPlan(resultado.data?.id ?? "");
    expect(guardados.error).toBeNull();
    expect(guardados.data).toHaveLength(2);
    expect(guardados.data).toEqual(
      expect.arrayContaining([
        {
          plan_id: resultado.data?.id,
          tramo_id: IDS.tramoA,
          costalero_id: IDS.filaCostaleroA,
          estado: "en_paso",
        },
        {
          plan_id: resultado.data?.id,
          tramo_id: IDS.tramoA,
          costalero_id: IDS.filaCostaleroB,
          estado: "descanso",
        },
      ]),
    );
  });

  it("no deja un plan persistido si falla la inserción de sus relevos", async () => {
    await restaurarRol(db);
    await db.exec(`
      create function public.fallar_al_insertar_relevos()
      returns trigger
      language plpgsql
      as $$
      begin
        raise exception 'Fallo inyectado al insertar relevos.';
      end;
      $$;

      create trigger fallar_al_insertar_relevos
      before insert on public.relevos
      for each row
      execute function public.fallar_al_insertar_relevos();
    `);
    await establecerActor(db, "authenticated", IDS.capatazA);
    const repos = crearRepositorioPlanes(client);

    const resultado = await repos.guardar(IDS.pasoA, entrada());

    expect(resultado.error).not.toBeNull();
    expect(resultado.data).toBeNull();
    await restaurarRol(db);
    const planes = await db.query<{ total: string }>(
      `select count(*)::text as total from public.planes`,
    );
    const relevos = await db.query<{ total: string }>(
      `select count(*)::text as total from public.relevos`,
    );
    expect(planes.rows[0]?.total).toBe("0");
    expect(relevos.rows[0]?.total).toBe("0");
  });

  it("impide que otro capataz guarde un plan de un paso ajeno", async () => {
    await establecerActor(db, "authenticated", IDS.capatazB);
    const repos = crearRepositorioPlanes(client);

    const resultado = await repos.guardar(IDS.pasoA, entrada());

    expect(resultado.error).not.toBeNull();
    expect(resultado.data).toBeNull();
    await restaurarRol(db);
    const planes = await db.query<{ total: string }>(
      `select count(*)::text as total from public.planes`,
    );
    expect(planes.rows[0]?.total).toBe("0");
  });
});

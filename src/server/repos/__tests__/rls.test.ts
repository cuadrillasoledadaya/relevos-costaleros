import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearFixturesBasicos, IDS } from "./fixtures";
import { crearPgliteDePrueba, establecerActor, restaurarRol } from "./pglite";

describe("RLS de Supabase emulado con PGlite", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await crearFixturesBasicos(db);
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("permite al capataz crear y leer su propia cuadrilla", async () => {
    await establecerActor(db, "authenticated", IDS.capatazA);

    const creado = await db.query<{ id: string; name: string }>(
      `insert into cuadrillas (name, season, owner_id)
       values ('Mi cuadrilla', 2025, $1)
       returning id, name`,
      [IDS.capatazA],
    );

    expect(creado.rows).toHaveLength(1);
    expect(creado.rows[0]?.name).toBe("Mi cuadrilla");

    const leidas = await db.query<{ id: string }>(
      `select id from cuadrillas where owner_id = $1 order by id`,
      [IDS.capatazA],
    );
    expect(leidas.rows.map((fila) => fila.id)).toContain(creado.rows[0]?.id);
  });

  it("impide que un capataz lea o escriba la cuadrilla de otro capataz", async () => {
    await establecerActor(db, "authenticated", IDS.capatazA);

    const lectura = await db.query<{ id: string }>(
      `select id from cuadrillas where id = $1`,
      [IDS.cuadrillaB],
    );
    expect(lectura.rows).toEqual([]);

    const actualizacion = await db.query(
      `update cuadrillas set name = 'Intrusión' where id = $1 returning id`,
      [IDS.cuadrillaB],
    );
    expect(actualizacion.rows).toEqual([]);

    await expect(
      db.query(
        `insert into cuadrillas (name, season, owner_id)
         values ('Intrusión', 2025, $1)`,
        [IDS.capatazB],
      ),
    ).rejects.toThrow();

    await restaurarRol(db);
    const estado = await db.query<{ name: string }>(
      `select name from cuadrillas where id = $1`,
      [IDS.cuadrillaB],
    );
    expect(estado.rows).toEqual([{ name: "Cuadrilla B" }]);
  });

  it("impide que un costalero lea un plan en borrador", async () => {
    await db.query(
      `insert into planes (id, paso_id, version, status, seed, solver_version, created_by)
       values ($1, $2, 1, 'borrador', 20250330, '1.0.0', $3)`,
      [IDS.planBorrador, IDS.pasoA, IDS.capatazA],
    );

    await establecerActor(db, "authenticated", IDS.costaleroA);
    const planes = await db.query<{ id: string }>(`select id from planes`);

    expect(planes.rows).toEqual([]);
  });

  it("permite que un costalero lea un plan publicado de su cuadrilla", async () => {
    await db.query(
      `insert into planes (id, paso_id, version, status, seed, solver_version, created_by)
       values ($1, $2, 1, 'publicado', 20250330, '1.0.0', $3)`,
      [IDS.planPublicado, IDS.pasoA, IDS.capatazA],
    );

    await establecerActor(db, "authenticated", IDS.costaleroA);
    const planes = await db.query<{ id: string; status: string }>(
      `select id, status from planes`,
    );

    expect(planes.rows).toEqual([
      { id: IDS.planPublicado, status: "publicado" },
    ]);
  });

  it("impide que un costalero lea los datos de otros costaleros de su cuadrilla", async () => {
    await establecerActor(db, "authenticated", IDS.costaleroA);
    const costaleros = await db.query<{ id: string; full_name: string }>(
      `select id, full_name from costaleros order by id`,
    );

    expect(costaleros.rows).toEqual([
      { id: IDS.filaCostaleroA, full_name: "Costalero A" },
    ]);
    expect(costaleros.rows.some((fila) => fila.id === IDS.filaCostaleroB)).toBe(
      false,
    );
    expect(costaleros.rows.some((fila) => fila.id === IDS.filaCostaleroC)).toBe(
      false,
    );
  });

  it("resuelve la pertenencia con costaleros.profile_id y no con el id de la fila", async () => {
    await db.query(
      `insert into planes (id, paso_id, version, status, seed, solver_version, created_by)
       values ($1, $2, 1, 'publicado', 20250330, '1.0.0', $3)`,
      [IDS.planPublicado, IDS.pasoA, IDS.capatazA],
    );

    // La identidad es la cuenta (IDS.costaleroA); la fila del costalero tiene
    // otro id (IDS.filaCostaleroA). El plan publicado tiene que verse igual.
    await establecerActor(db, "authenticated", IDS.costaleroA);
    const planes = await db.query<{ id: string }>(`select id from planes`);

    expect(planes.rows).toEqual([{ id: IDS.planPublicado }]);
  });

  it("no da acceso a nadie a un costalero sin cuenta", async () => {
    await db.query(
      `insert into planes (id, paso_id, version, status, seed, solver_version, created_by)
       values ($1, $2, 1, 'publicado', 20250330, '1.0.0', $3)`,
      [IDS.planPublicado, IDS.pasoA, IDS.capatazA],
    );

    // El costalero C no tiene profile_id: su id de fila no es una identidad.
    await establecerActor(db, "authenticated", IDS.filaCostaleroC);
    const planes = await db.query<{ id: string }>(`select id from planes`);
    const costaleros = await db.query<{ id: string }>(
      `select id from costaleros`,
    );

    expect(planes.rows).toEqual([]);
    expect(costaleros.rows).toEqual([]);
  });

  it("permite al capataz dar de alta un costalero antes de que tenga cuenta", async () => {
    await establecerActor(db, "authenticated", IDS.capatazA);

    const creado = await db.query<{ id: string; profile_id: string | null }>(
      `insert into costaleros (cuadrilla_id, full_name)
       values ($1, 'Costalero recien dado de alta')
       returning id, profile_id`,
      [IDS.cuadrillaA],
    );

    expect(creado.rows).toHaveLength(1);
    expect(creado.rows[0]?.profile_id).toBeNull();
  });
});

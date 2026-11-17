import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearPgliteDePrueba } from "./pglite";

describe("seed de demostración", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearPgliteDePrueba({ aplicarSeed: true });
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("crea la cuadrilla, el paso, los pools, las boquillas y los cuatro tramos", async () => {
    const conteos = await db.query<{
      cuadrillas: string;
      costaleros: string;
      pasos: string;
      trabajaderas: string;
      asignaciones: string;
      boquillas: string;
      tramos: string;
    }>(`
      select
        (select count(*) from cuadrillas)::text as cuadrillas,
        (select count(*) from costaleros)::text as costaleros,
        (select count(*) from pasos)::text as pasos,
        (select count(*) from trabajaderas)::text as trabajaderas,
        (select count(*) from asignaciones)::text as asignaciones,
        (select count(*) from asignaciones where is_boquilla)::text as boquillas,
        (select count(*) from tramos)::text as tramos
    `);

    expect(conteos.rows[0]).toEqual({
      cuadrillas: "1",
      costaleros: "12",
      pasos: "1",
      trabajaderas: "3",
      asignaciones: "12",
      boquillas: "2",
      tramos: "4",
    });
  });

  it("deja el paso planificable y cumple F-1..F-6", async () => {
    const datos = await db.query<{
      pool: string;
      carga: string;
      r: string;
      t: string;
      boquillas: string;
    }>(`
      select
        count(a.costalero_id)::text as pool,
        t.carga::text as carga,
        (count(a.costalero_id) - t.carga)::text as r,
        (select count(*) from tramos)::text as t,
        (select count(*) from asignaciones where is_boquilla)::text as boquillas
      from trabajaderas t
      join pasos p on p.id = t.paso_id
      join asignaciones a on a.trabajadera_id = t.id
      group by t.id, t.carga
      order by t.position
    `);

    expect(datos.rows).toHaveLength(3);
    for (const fila of datos.rows) {
      const pool = Number(fila.pool);
      const carga = Number(fila.carga);
      const r = Number(fila.r);
      const t = Number(fila.t);

      expect(r).toBeGreaterThanOrEqual(1); // F-1
      expect(t * r).toBeGreaterThanOrEqual(2 * pool); // F-2
      expect(pool * Math.ceil(t / 2)).toBeGreaterThanOrEqual(t * r); // F-3
      expect(pool).toBeGreaterThanOrEqual(carga + 1); // F-4
    }

    expect(Number(datos.rows[0]?.boquillas)).toBe(2); // F-5
    expect(Number(datos.rows[0]?.t)).toBeGreaterThanOrEqual(2); // F-6
  });

  it("ordena los tramos con salida, dos normales y entrada", async () => {
    const tramos = await db.query<{ ordinal: number; kind: string }>(
      `select ordinal, kind from tramos order by ordinal`,
    );

    expect(tramos.rows).toEqual([
      { ordinal: 1, kind: "salida" },
      { ordinal: 2, kind: "normal" },
      { ordinal: 3, kind: "normal" },
      { ordinal: 4, kind: "entrada" },
    ]);
  });

  it("crea cuentas de Supabase Auth reales, con identidad y tokens vacios", async () => {
    // GoTrue es estricto: sin instance_id, aud y role no ve la cuenta; sin
    // fila en auth.identities ni con las columnas de token a '' (no NULL) el
    // login devuelve 500 "Database error querying schema". El seed tiene que
    // dejar las cuentas en la forma que GoTrue espera.
    const cuentas = await db.query<{
      total: string;
      con_instance: string;
      con_aud: string;
      tokens_nullos: string;
    }>(`
      select
        count(*)::text as total,
        count(*) filter (where instance_id is not null)::text as con_instance,
        count(*) filter (where aud = 'authenticated' and role = 'authenticated')::text as con_aud,
        count(*) filter (
          where confirmation_token is null
             or recovery_token is null
             or email_change_token_current is null
             or reauthentication_token is null
        )::text as tokens_nullos
      from auth.users
    `);

    expect(cuentas.rows[0]?.total).toBe("12");
    expect(cuentas.rows[0]?.con_instance).toBe("12");
    expect(cuentas.rows[0]?.con_aud).toBe("12");
    expect(cuentas.rows[0]?.tokens_nullos).toBe("0");

    const identidades = await db.query<{ total: string }>(
      `select count(*)::text as total from auth.identities`,
    );
    expect(identidades.rows[0]?.total).toBe("12");
  });
});

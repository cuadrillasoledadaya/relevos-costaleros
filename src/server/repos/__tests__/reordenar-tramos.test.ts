import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { crearRepositorioTramos } from "../tramos";
import { IDS, crearFixturesBasicos } from "./fixtures";
import { crearPgliteDePrueba, establecerActor, restaurarRol } from "./pglite";
import { crearClientePglite } from "./pglite-client";

/**
 * Reordenación de los tramos del recorrido (§8.3).
 *
 * El reordenamiento tiene que ser TRANSACCIONAL: o se aplica entero, o no se
 * aplica nada. Nunca puede quedar un `ordinal` repetido ni un hueco, porque el
 * índice único `(paso_id, ordinal)` y el orden del recorrido lo dependen.
 */
describe("reordenación transaccional de los tramos", () => {
  let db: PGlite;
  let client: ReturnType<typeof crearClientePglite>;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await crearFixturesBasicos(db);
    await establecerActor(db, "authenticated", IDS.capatazA);
    client = crearClientePglite(db);
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  /** Crea `nombres` tramos del paso `pasoId` y devuelve sus ids en orden. */
  async function crearTramos(
    nombres: string[],
    pasoId = IDS.pasoA,
  ): Promise<string[]> {
    const repos = crearRepositorioTramos(client);
    const ids: string[] = [];
    for (const [indice, nombre] of nombres.entries()) {
      const creado = await repos.crear({
        paso_id: pasoId,
        name: nombre,
        ordinal: indice + 1,
        kind:
          indice === 0
            ? "salida"
            : indice === nombres.length - 1
              ? "entrada"
              : "normal",
      });
      expect(creado.error).toBeNull();
      ids.push(creado.data?.id ?? "");
    }
    return ids;
  }

  it("reordena los tramos sin dejar ordinales repetidos ni huecos", async () => {
    const ids = await crearTramos(["Salida", "Tramo 2", "Tramo 3", "Entrada"]);
    const repos = crearRepositorioTramos(client);

    const resultado = await repos.reordenar(IDS.pasoA, [
      ids[3] as string,
      ids[0] as string,
      ids[2] as string,
      ids[1] as string,
    ]);

    expect(resultado.error).toBeNull();
    expect(resultado.data.map((tramo) => tramo.name)).toEqual([
      "Entrada",
      "Salida",
      "Tramo 3",
      "Tramo 2",
    ]);
    expect(resultado.data.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3, 4]);

    const guardado = await db.query<{ ordinal: number }>(
      `select ordinal from tramos where paso_id = $1 order by ordinal`,
      [IDS.pasoA],
    );
    expect(guardado.rows.map((fila) => fila.ordinal)).toEqual([1, 2, 3, 4]);
  });

  it("recalcula la salida y la entrada al cambiar el orden", async () => {
    const ids = await crearTramos(["Salida", "Tramo 2", "Tramo 3", "Entrada"]);
    const repos = crearRepositorioTramos(client);

    const resultado = await repos.reordenar(IDS.pasoA, [
      ids[2] as string,
      ids[1] as string,
      ids[0] as string,
      ids[3] as string,
    ]);

    expect(resultado.error).toBeNull();
    expect(resultado.data[0]?.kind).toBe("salida");
    expect(resultado.data[resultado.data.length - 1]?.kind).toBe("entrada");
    expect(
      resultado.data.slice(1, -1).every((tramo) => tramo.kind === "normal"),
    ).toBe(true);
  });

  it("rechaza una lista de tramos que no es la del paso y no cambia nada", async () => {
    const ids = await crearTramos(["Salida", "Tramo 2", "Entrada"]);
    const repos = crearRepositorioTramos(client);
    const antes = await db.query<{
      id: string;
      ordinal: number;
      kind: string;
    }>(`select id, ordinal, kind from tramos order by ordinal`);

    const resultado = await repos.reordenar(IDS.pasoA, [
      ids[0] as string,
      ids[1] as string,
    ]);

    expect(resultado.error).not.toBeNull();
    expect(resultado.data).toEqual([]);
    const despues = await db.query<{
      id: string;
      ordinal: number;
      kind: string;
    }>(`select id, ordinal, kind from tramos order by ordinal`);
    expect(despues.rows).toEqual(antes.rows);
  });

  it("otro capataz no puede reordenar los tramos de un paso ajeno", async () => {
    const ids = await crearTramos(["Salida", "Tramo 2", "Entrada"]);
    await establecerActor(db, "authenticated", IDS.capatazB);
    const repos = crearRepositorioTramos(client);

    const resultado = await repos.reordenar(IDS.pasoA, [
      ids[2] as string,
      ids[1] as string,
      ids[0] as string,
    ]);

    expect(resultado.error).not.toBeNull();
    // La comprobación se hace sin RLS: con el rol del otro capataz los
    // tramos ajenos no se ven, y no se puede afirmar nada sobre ellos.
    await restaurarRol(db);
    const guardado = await db.query<{ ordinal: number }>(
      `select ordinal from tramos where paso_id = $1 order by ordinal`,
      [IDS.pasoA],
    );
    expect(guardado.rows.map((fila) => fila.ordinal)).toEqual([1, 2, 3]);
  });

  it("añade un tramo al final del recorrido y recalcula la entrada", async () => {
    await crearTramos(["Salida", "Tramo 2", "Entrada"]);
    const repos = crearRepositorioTramos(client);

    const resultado = await repos.anexar(IDS.pasoA, "Vuelta a la plaza");

    expect(resultado.error).toBeNull();
    expect(resultado.data.map((tramo) => tramo.name)).toEqual([
      "Salida",
      "Tramo 2",
      "Entrada",
      "Vuelta a la plaza",
    ]);
    expect(resultado.data.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3, 4]);
    expect(resultado.data[0]?.kind).toBe("salida");
    expect(resultado.data[resultado.data.length - 1]?.kind).toBe("entrada");
    // Sólo hay una entrada: el tramo que era la entrada pasa a ser normal.
    expect(
      resultado.data.filter((tramo) => tramo.kind === "entrada"),
    ).toHaveLength(1);
  });

  it("no añade un tramo sin nombre", async () => {
    await crearTramos(["Salida", "Entrada"]);
    const repos = crearRepositorioTramos(client);

    const resultado = await repos.anexar(IDS.pasoA, "   ");

    expect(resultado.error).not.toBeNull();
    const guardado = await db.query<{ total: string }>(
      `select count(*)::text as total from tramos where paso_id = $1`,
      [IDS.pasoA],
    );
    expect(guardado.rows[0]?.total).toBe("2");
  });

  it("borra un tramo intermedio y renumera los que quedan", async () => {
    const ids = await crearTramos(["Salida", "Tramo 2", "Tramo 3", "Entrada"]);
    const repos = crearRepositorioTramos(client);

    const resultado = await repos.eliminar(ids[1] as string);

    expect(resultado.error).toBeNull();
    expect(resultado.data.map((tramo) => tramo.name)).toEqual([
      "Salida",
      "Tramo 3",
      "Entrada",
    ]);
    expect(resultado.data.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3]);
    expect(resultado.data[0]?.kind).toBe("salida");
    expect(resultado.data[2]?.kind).toBe("entrada");
  });

  it("no borra un tramo de un paso ajeno", async () => {
    const ids = await crearTramos(["Salida", "Entrada"]);
    await establecerActor(db, "authenticated", IDS.capatazB);
    const repos = crearRepositorioTramos(client);

    const resultado = await repos.eliminar(ids[0] as string);

    expect(resultado.error).not.toBeNull();
    await restaurarRol(db);
    const guardado = await db.query<{ total: string }>(
      `select count(*)::text as total from tramos where paso_id = $1`,
      [IDS.pasoA],
    );
    expect(guardado.rows[0]?.total).toBe("2");
  });

  it("recalcula todos los tipos canónicos al añadir un tramo", async () => {
    const repos = crearRepositorioTramos(client);
    const tipos: Array<"salida" | "normal" | "entrada"> = [
      "normal",
      "normal",
      "entrada",
    ];

    for (const [indice, kind] of tipos.entries()) {
      const creado = await repos.crear({
        paso_id: IDS.pasoA,
        name: `Tramo ${String(indice + 1)}`,
        ordinal: indice + 1,
        kind,
      });
      expect(creado.error).toBeNull();
    }

    const resultado = await repos.anexar(IDS.pasoA, "Vuelta a la plaza");

    expect(resultado.error).toBeNull();
    expect(resultado.data.map((tramo) => tramo.kind)).toEqual([
      "salida",
      "normal",
      "normal",
      "entrada",
    ]);
  });

  it("deshace el alta completa si falla la fase final de tipos", async () => {
    const repos = crearRepositorioTramos(client);
    const tipos: Array<"salida" | "normal" | "entrada"> = [
      "normal",
      "normal",
      "entrada",
    ];

    for (const [indice, kind] of tipos.entries()) {
      const creado = await repos.crear({
        paso_id: IDS.pasoA,
        name: `Tramo ${String(indice + 1)}`,
        ordinal: indice + 1,
        kind,
      });
      expect(creado.error).toBeNull();
    }

    const antes = await db.query<{ fila: string }>(
      `select row_to_json(t)::text as fila
         from public.tramos t
        where t.paso_id = $1
        order by t.ordinal`,
      [IDS.pasoA],
    );

    await restaurarRol(db);
    await db.exec(`
      create function public.fallar_en_la_fase_de_tipos()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.ordinal = 1
           and new.kind = 'salida'
           and old.kind is distinct from 'salida' then
          raise exception 'Fallo inyectado en la fase de tipos.';
        end if;
        return new;
      end;
      $$;

      create trigger fallar_en_la_fase_de_tipos
      before update of kind on public.tramos
      for each row
      execute function public.fallar_en_la_fase_de_tipos();
    `);
    await establecerActor(db, "authenticated", IDS.capatazA);

    const resultado = await repos.anexar(IDS.pasoA, "Vuelta a la plaza");

    expect(resultado.error).not.toBeNull();
    await restaurarRol(db);
    const despues = await db.query<{ fila: string }>(
      `select row_to_json(t)::text as fila
         from public.tramos t
        where t.paso_id = $1
        order by t.ordinal`,
      [IDS.pasoA],
    );
    expect(despues.rows).toEqual(antes.rows);
  });
});

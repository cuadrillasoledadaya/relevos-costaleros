import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { cambiarTipoTramo, renombrarTramo } from "@/server/actions/tramo";
import { IDS, crearFixturesBasicos } from "@/server/repos/__tests__/fixtures";
import {
  crearPgliteDePrueba,
  establecerActor,
  restaurarRol,
} from "@/server/repos/__tests__/pglite";
import { crearClientePglite } from "@/server/repos/__tests__/pglite-client";
import {
  crearRepositorioTramos,
  type RepositorioTramos,
} from "@/server/repos/tramos";

/**
 * VERIFICACIÓN PROPIA del bloqueante 2: una operación rechazada no puede haber
 * cambiado los datos, y un tipo forzado a mano sobrevive a un renombrado.
 */
describe("bloqueante 2 · una operación rechazada no deja datos tocados", () => {
  let db: PGlite;
  let repos: RepositorioTramos;
  let llamadas: {
    actualizar: number;
    listarPorPaso: number;
    obtenerPorId: number;
    actualizarEnRecorrido: number;
  };

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await crearFixturesBasicos(db);
    await establecerActor(db, "authenticated", IDS.capatazA);

    const base = crearRepositorioTramos(crearClientePglite(db));
    llamadas = {
      actualizar: 0,
      listarPorPaso: 0,
      obtenerPorId: 0,
      actualizarEnRecorrido: 0,
    };
    repos = {
      ...base,
      actualizar: (...args) => {
        llamadas.actualizar += 1;
        return base.actualizar(...args);
      },
      listarPorPaso: (...args) => {
        llamadas.listarPorPaso += 1;
        return base.listarPorPaso(...args);
      },
      obtenerPorId: (...args) => {
        llamadas.obtenerPorId += 1;
        return base.obtenerPorId(...args);
      },
      actualizarEnRecorrido: (...args) => {
        llamadas.actualizarEnRecorrido += 1;
        return base.actualizarEnRecorrido(...args);
      },
    };

    for (const [indice, nombre] of ["Salida", "Tramo 2", "Entrada"].entries()) {
      const creado = await base.crear({
        paso_id: IDS.pasoA,
        name: nombre,
        ordinal: indice + 1,
        kind: indice === 0 ? "salida" : indice === 2 ? "entrada" : "normal",
      });
      expect(creado.error).toBeNull();
    }
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  async function hashTramos(): Promise<string> {
    const salida = await db.query<{ h: string }>(
      `select coalesce(md5(string_agg(t::text, '|' order by t.ordinal)), '') as h
         from public.tramos t
        where t.paso_id = $1`,
      [IDS.pasoA],
    );
    return salida.rows[0]?.h ?? "";
  }

  async function idsTramos(): Promise<string[]> {
    const salida = await db.query<{ id: string }>(
      `select id from public.tramos where paso_id = $1 order by ordinal`,
      [IDS.pasoA],
    );
    return salida.rows.map((fila) => fila.id);
  }

  it("un fallo DESPUÉS de escribir deja la fila intacta (todo o nada)", async () => {
    const [, id2] = await idsTramos();
    const antes = await hashTramos();

    // Se inyecta el fallo justo después de la escritura: es el escenario del
    // bloqueante (la escritura、鱼 la relectura fallaba).
    await restaurarRol(db);
    await db.exec(`
      create function public.fallo_despues_de_escribir() returns trigger
      language plpgsql as $$
      begin
        raise exception 'Fallo inyectado después de escribir.';
      end;
      $$;
      create trigger fallo_despues_de_escribir
      after update on public.tramos
      for each row execute function public.fallo_despues_de_escribir();
    `);
    await establecerActor(db, "authenticated", IDS.capatazA);

    const renombre = await renombrarTramo(
      { pasoId: IDS.pasoA, tramoId: id2 as string, nombre: "Plaza del pueblo" },
      repos,
    );
    const tipo = await cambiarTipoTramo(
      { pasoId: IDS.pasoA, tramoId: id2 as string, tipo: "entrada" },
      repos,
    );

    expect(renombre.ok).toBe(false);
    expect(tipo.ok).toBe(false);
    if (!renombre.ok) {
      expect(renombre.error).toContain("Fallo inyectado después de escribir");
    }
    if (!tipo.ok) {
      expect(tipo.error).toContain("Fallo inyectado después de escribir");
    }
    await restaurarRol(db);
    expect(await hashTramos()).toBe(antes);
  });

  it("rechaza un nombre vacío y un tipo inválido sin tocar la fila", async () => {
    const [, id2] = await idsTramos();
    const antes = await hashTramos();

    const vacio = await repos.actualizarEnRecorrido(id2 as string, {
      name: "   ",
    });
    expect(vacio.error?.message).toBe(
      "El nombre del tramo no puede estar vacío.",
    );

    const invalido = await repos.actualizarEnRecorrido(id2 as string, {
      kind: "otro" as "normal",
    });
    expect(invalido.error?.message).toBe(
      "El tipo del tramo tiene que ser salida, normal o entrada.",
    );

    await restaurarRol(db);
    expect(await hashTramos()).toBe(antes);
  });

  it("rechaza un tramo que no existe sin tocar las demás filas", async () => {
    const antes = await hashTramos();
    const inexistente = await repos.actualizarEnRecorrido(
      "99999999-9999-4999-8999-999999999999",
      { name: "Fantasma" },
    );
    expect(inexistente.error?.message).toBe("El tramo no existe.");
    await restaurarRol(db);
    expect(await hashTramos()).toBe(antes);
  });

  it("un tipo forzado a mano sobrevive a un renombrado y a otro cambio", async () => {
    const [, id2, id3] = await idsTramos();

    // El capataz fuerza a mano el tipo del tramo 2.
    const hashAntesDeForzar = await hashTramos();
    const forzado = await repos.actualizarEnRecorrido(id2 as string, {
      kind: "entrada",
    });
    expect(forzado.error).toBeNull();
    // El hash cambia: no es un valor constante que no detecte diferencias.
    expect(await hashTramos()).not.toBe(hashAntesDeForzar);

    const renombre = await renombrarTramo(
      { pasoId: IDS.pasoA, tramoId: id3 as string, nombre: "Plaza" },
      repos,
    );
    expect(renombre.ok).toBe(true);

    const trasRenombrar = await repos.listarPorPaso(IDS.pasoA);
    expect(trasRenombrar.data.find((t) => t.id === id2)?.kind).toBe("entrada");

    const cambio = await cambiarTipoTramo(
      { pasoId: IDS.pasoA, tramoId: id3 as string, tipo: "normal" },
      repos,
    );
    expect(cambio.ok).toBe(true);

    const trasCambio = await repos.listarPorPaso(IDS.pasoA);
    expect(trasCambio.data.find((t) => t.id === id2)?.kind).toBe("entrada");
  });

  it("la acción escribe una sola vez y no relee el recorrido por su cuenta", async () => {
    const [, id2] = await idsTramos();
    const resultado = await renombrarTramo(
      { pasoId: IDS.pasoA, tramoId: id2 as string, nombre: "Plaza" },
      repos,
    );
    expect(resultado.ok).toBe(true);
    expect(llamadas.actualizarEnRecorrido).toBe(1);
    expect(llamadas.actualizar).toBe(0);
    expect(llamadas.listarPorPaso).toBe(0);
  });
});

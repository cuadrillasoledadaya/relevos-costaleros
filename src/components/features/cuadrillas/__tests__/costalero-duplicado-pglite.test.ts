import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { crearRepositorioCostaleros } from "@/server/repos/costaleros";
import { crearFixturesBasicos, IDS } from "@/server/repos/__tests__/fixtures";
import {
  crearPgliteDePrueba,
  restaurarRol,
} from "@/server/repos/__tests__/pglite";
import { crearClientePglite } from "@/server/repos/__tests__/pglite-client";
import { ejecutarCrearCostalero } from "@/server/actions/cuadrilla";
import type { CostaleroInput } from "@/lib/schemas";

describe("unicidad del costalero con PGlite", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await crearFixturesBasicos(db);
  }, 30_000);

  afterEach(async () => {
    await restaurarRol(db);
    await db?.close();
  });

  it("rechaza el mismo correo en otra cuadrilla y conserva una sola fila", async () => {
    const cliente = crearClientePglite(db);
    const costaleros = crearRepositorioCostaleros(cliente);
    const dependencias = {
      usuarioActualId: IDS.capatazA,
      esCapatazDeCuadrilla: async () => true,
      resolverPerfilPorEmail: async () => IDS.costaleroC,
      buscarCostaleroPorPerfil: async (profileId: string) => {
        const existentes = await db.query<{
          id: string;
          cuadrilla_id: string;
        }>(`select id, cuadrilla_id from costaleros where profile_id = $1`, [
          profileId,
        ]);
        return existentes.rows[0] ?? null;
      },
      crear: async (entrada: CostaleroInput) => {
        const creado = await costaleros.crear(entrada);
        return {
          id: creado.data?.id ?? "",
          error: creado.error?.message ?? null,
        };
      },
    };

    const primero = await ejecutarCrearCostalero(
      {
        cuadrillaId: IDS.cuadrillaA,
        full_name: "Costalero A",
        nickname: null,
        phone: null,
        notes: null,
        email: "costalero-a@example.test",
      },
      dependencias,
    );
    const segundo = await ejecutarCrearCostalero(
      {
        cuadrillaId: IDS.cuadrillaB,
        full_name: "Costalero A",
        nickname: null,
        phone: null,
        notes: null,
        email: "costalero-a@example.test",
      },
      dependencias,
    );
    const filas = await db.query<{ total: string }>(
      `select count(*)::text as total from costaleros where profile_id = $1`,
      [IDS.costaleroC],
    );

    expect(primero.ok).toBe(true);
    expect(segundo.ok).toBe(false);
    expect(segundo.mensaje).toContain("otra cuadrilla");
    expect(filas.rows).toEqual([{ total: "1" }]);
  });
});

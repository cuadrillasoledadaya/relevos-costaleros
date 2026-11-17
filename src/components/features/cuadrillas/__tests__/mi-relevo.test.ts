import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearFixturesBasicos, IDS } from "@/server/repos/__tests__/fixtures";
import {
  crearPgliteDePrueba,
  establecerActor,
  restaurarRol,
} from "@/server/repos/__tests__/pglite";
import {
  cargarMiRelevo,
  type FuenteMiRelevo,
} from "@/server/actions/costalero";

describe("P8 · mi relevo", () => {
  it("muestra sólo los estados del costalero aunque la fuente devuelva otros", async () => {
    const fuente: FuenteMiRelevo = {
      async obtenerContexto() {
        return {
          costalero: {
            id: "fila-propia",
            full_name: "Ana García",
            nickname: "Ana",
          },
          cuadrillaId: "cuadrilla-1",
          planesPublicados: [
            {
              id: "plan-publicado",
              pasoId: "paso-1",
              pasoNombre: "Cristo de la Salud",
              version: 2,
            },
          ],
        };
      },
      async obtenerRelevos() {
        return [
          {
            planId: "plan-publicado",
            tramoId: "tramo-1",
            tramoNombre: "Salida",
            ordinal: 1,
            kind: "salida",
            costaleroId: "fila-propia",
            costaleroNombre: "Ana García",
            estado: "descanso",
          },
          {
            planId: "plan-publicado",
            tramoId: "tramo-2",
            tramoNombre: "Entrada",
            ordinal: 2,
            kind: "entrada",
            costaleroId: "fila-otra",
            costaleroNombre: "Nombre que no debe filtrarse",
            estado: "en_paso",
          },
        ];
      },
    };

    const resultado = await cargarMiRelevo("cuadrilla-1", fuente);

    expect(resultado.estado).toBe("ok");
    if (resultado.estado !== "ok") return;
    expect(resultado.planes).toHaveLength(1);
    expect(resultado.planes[0]?.tramos).toHaveLength(1);
    expect(resultado.planes[0]?.tramos[0]?.nombre).toBe("Salida");
    expect(JSON.stringify(resultado)).not.toContain(
      "Nombre que no debe filtrarse",
    );
  });

  it("no consulta una cuadrilla que no pertenece al costalero", async () => {
    let consulted = false;
    const fuente: FuenteMiRelevo = {
      async obtenerContexto() {
        return {
          costalero: {
            id: "fila-propia",
            full_name: "Ana García",
            nickname: null,
          },
          cuadrillaId: "cuadrilla-propia",
          planesPublicados: [],
        };
      },
      async obtenerRelevos() {
        consulted = true;
        return [];
      },
    };

    const resultado = await cargarMiRelevo("cuadrilla-ajena", fuente);

    expect(resultado.estado).toBe("sin-acceso");
    expect(consulted).toBe(false);
  });
});

describe("P8 · RLS del costalero", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await crearFixturesBasicos(db);
  }, 30_000);

  afterEach(async () => {
    await restaurarRol(db);
    await db?.close();
  });

  it("sólo deja leer el plan publicado de su cuadrilla", async () => {
    await db.query(
      `insert into planes (id, paso_id, version, status, seed, solver_version, created_by)
       values
         ($1, $2, 1, 'borrador', 20250330, '1.0.0', $3),
         ($4, $2, 2, 'publicado', 20250330, '1.0.0', $3)`,
      [IDS.planBorrador, IDS.pasoA, IDS.capatazA, IDS.planPublicado],
    );

    await establecerActor(db, "authenticated", IDS.costaleroA);
    const planes = await db.query<{ id: string; status: string }>(
      `select id, status from planes order by id`,
    );
    const costaleros = await db.query<{ id: string; full_name: string }>(
      `select id, full_name from costaleros order by id`,
    );

    expect(planes.rows).toEqual([
      { id: IDS.planPublicado, status: "publicado" },
    ]);
    expect(costaleros.rows).toEqual([
      { id: IDS.filaCostaleroA, full_name: "Costalero A" },
    ]);
  });
});

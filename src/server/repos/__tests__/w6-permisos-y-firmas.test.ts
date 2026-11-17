import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";

import { crearPgliteDePrueba } from "@/server/repos/__tests__/pglite";

/**
 * Regresiones DIRECTAS de la corrección: los permisos de las funciones nuevas
 * y las firmas por nombres de argumento (así las busca PostgREST).
 */
const ESPERADAS = {
  anexar_tramo: ["p_paso_id", "p_nombre"],
  actualizar_tramo: ["p_tramo_id", "p_nombre", "p_tipo"],
  borrar_tramo: ["p_tramo_id"],
  reordenar_tramos: ["p_paso_id", "p_orden"],
} as const;

describe("regresiones directas · permisos y firmas de las funciones de tramos", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("cada función existe una sola vez (sin sobrecargas) con sus argumentos", async () => {
    const filas = await db.query<{ proname: string; proargnames: string[] }>(
      `select p.proname, p.proargnames
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = any($1)
        order by p.proname`,
      [Object.keys(ESPERADAS)],
    );
    const porNombre = new Map<string, string[][]>();
    for (const fila of filas.rows) {
      porNombre.set(fila.proname, [
        ...(porNombre.get(fila.proname) ?? []),
        fila.proargnames,
      ]);
    }
    for (const [nombre, argumentos] of Object.entries(ESPERADAS)) {
      const encontradas = porNombre.get(nombre) ?? [];
      expect(encontradas).toHaveLength(1);
      expect(encontradas[0]).toEqual(argumentos);
    }
  });

  it("la búsqueda por nombre de argumentos (como la de PostgREST) es inequívoca", async () => {
    for (const [nombre, argumentos] of Object.entries(ESPERADAS)) {
      const filas = await db.query<{ n: string }>(
        `select count(*)::text as n
           from pg_proc p
           join pg_namespace ns on ns.oid = p.pronamespace
          where ns.nspname = 'public'
            and p.proname = $1
            and p.proargnames = $2::text[]`,
        [nombre, argumentos],
      );
      expect(filas.rows[0]?.n).toBe("1");
    }
  });

  it("ni anon ni PUBLIC pueden ejecutar las funciones; authenticated si", async () => {
    const firmas: Record<string, string> = {
      anexar_tramo: "public.anexar_tramo(uuid,text)",
      actualizar_tramo: "public.actualizar_tramo(uuid,text,text)",
      borrar_tramo: "public.borrar_tramo(uuid)",
      reordenar_tramos: "public.reordenar_tramos(uuid,uuid[])",
    };
    for (const firma of Object.values(firmas)) {
      const filas = await db.query<{
        anon: boolean;
        publico: boolean;
        autenticado: boolean;
        servicio: boolean;
      }>(
        `select
           has_function_privilege('anon', $1, 'execute') as anon,
           has_function_privilege('public', $1, 'execute') as publico,
           has_function_privilege('authenticated', $1, 'execute') as autenticado,
           has_function_privilege('service_role', $1, 'execute') as servicio`,
        [firma],
      );
      const fila = filas.rows[0];
      expect(fila?.anon).toBe(false);
      expect(fila?.publico).toBe(false);
      expect(fila?.autenticado).toBe(true);
      expect(fila?.servicio).toBe(true);
    }
  });
});

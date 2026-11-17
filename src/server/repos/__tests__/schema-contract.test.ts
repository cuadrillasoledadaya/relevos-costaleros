import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearPgliteDePrueba } from "./pglite";

const RAIZ_REPOSITORIO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

/** Orden por nombre estable, sin depender de la collation ni del locale. */
function porNombre(a: readonly string[], b: readonly string[]): number {
  if (a[0]! < b[0]!) return -1;
  if (a[0]! > b[0]!) return 1;
  return 0;
}

const COLUMNAS_ESPERADAS: Record<string, Array<[string, string, string]>> = {
  profiles: [
    ["id", "uuid", "NO"],
    ["full_name", "text", "NO"],
    ["role", "text", "NO"],
    ["created_at", "timestamp with time zone", "NO"],
  ],
  cuadrillas: [
    ["id", "uuid", "NO"],
    ["name", "text", "NO"],
    ["season", "integer", "NO"],
    ["owner_id", "uuid", "NO"],
    ["notes", "text", "YES"],
    ["created_at", "timestamp with time zone", "NO"],
    ["updated_at", "timestamp with time zone", "NO"],
  ],
  costaleros: [
    ["id", "uuid", "NO"],
    ["cuadrilla_id", "uuid", "NO"],
    ["profile_id", "uuid", "YES"],
    ["full_name", "text", "NO"],
    ["nickname", "text", "YES"],
    ["phone", "text", "YES"],
    ["notes", "text", "YES"],
    ["active", "boolean", "NO"],
    ["created_at", "timestamp with time zone", "NO"],
    ["updated_at", "timestamp with time zone", "NO"],
  ],
  pasos: [
    ["id", "uuid", "NO"],
    ["cuadrilla_id", "uuid", "NO"],
    ["name", "text", "NO"],
    ["season", "integer", "NO"],
    ["num_trabajaderas", "integer", "NO"],
    ["created_at", "timestamp with time zone", "NO"],
    ["updated_at", "timestamp with time zone", "NO"],
  ],
  trabajaderas: [
    ["id", "uuid", "NO"],
    ["paso_id", "uuid", "NO"],
    ["position", "integer", "NO"],
    ["carga", "integer", "NO"],
  ],
  asignaciones: [
    ["trabajadera_id", "uuid", "NO"],
    ["costalero_id", "uuid", "NO"],
    ["is_boquilla", "boolean", "NO"],
  ],
  tramos: [
    ["id", "uuid", "NO"],
    ["paso_id", "uuid", "NO"],
    ["name", "text", "NO"],
    ["ordinal", "integer", "NO"],
    ["kind", "text", "NO"],
  ],
  planes: [
    ["id", "uuid", "NO"],
    ["paso_id", "uuid", "NO"],
    ["version", "integer", "NO"],
    ["status", "text", "NO"],
    ["seed", "bigint", "NO"],
    ["solver_version", "text", "NO"],
    ["stats", "jsonb", "YES"],
    ["created_by", "uuid", "YES"],
    ["created_at", "timestamp with time zone", "NO"],
  ],
  relevos: [
    ["plan_id", "uuid", "NO"],
    ["tramo_id", "uuid", "NO"],
    ["costalero_id", "uuid", "NO"],
    ["estado", "text", "NO"],
  ],
};

describe("contrato del schema", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("crea exactamente las tablas y columnas de §10", async () => {
    const tablas = await db.query<{ table_name: string }>(
      `select table_name
         from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
        order by table_name`,
    );
    expect(tablas.rows.map((fila) => fila.table_name)).toEqual(
      Object.keys(COLUMNAS_ESPERADAS).sort(),
    );

    for (const [tabla, esperadas] of Object.entries(COLUMNAS_ESPERADAS)) {
      const columnas = await db.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        `select column_name, data_type, is_nullable
           from information_schema.columns
          where table_schema = 'public' and table_name = $1`,
        [tabla],
      );

      // El contrato es el conjunto de columnas, no su posición física: una
      // migración que añade una columna la deja al final.
      expect(
        columnas.rows
          .map((fila) => [fila.column_name, fila.data_type, fila.is_nullable])
          .sort(porNombre),
      ).toEqual([...esperadas].sort(porNombre));
    }
  });

  it("activa RLS en todas las tablas y autoriza con auth.uid()", async () => {
    const tablas = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by c.relname`,
    );

    expect(tablas.rows).toHaveLength(9);
    expect(tablas.rows.every((tabla) => tabla.relrowsecurity)).toBe(true);

    const politica = await readFile(
      path.join(
        RAIZ_REPOSITORIO,
        "supabase/migrations/20250330000200_rls_por_rol.sql",
      ),
      "utf8",
    );
    expect(politica).not.toContain("current_setting");
    expect(politica).toContain("auth.uid()");
  });

  it("aplica las claves primarias, únicas, foráneas y checks de §10", async () => {
    const constraints = await db.query<{
      table_name: string;
      constraint_name: string;
      constraint_type: string;
      definition: string;
    }>(
      `select conrelid::regclass::text as table_name,
              conname as constraint_name,
              contype::text as constraint_type,
              pg_get_constraintdef(oid) as definition
         from pg_constraint
        where connamespace = 'public'::regnamespace
        order by table_name, constraint_type, constraint_name`,
    );

    const byTable = new Map<string, typeof constraints.rows>();
    for (const constraint of constraints.rows) {
      const lista = byTable.get(constraint.table_name) ?? [];
      lista.push(constraint);
      byTable.set(constraint.table_name, lista);
    }

    const primaryKeys = new Map(
      [...byTable].map(([tabla, lista]) => [
        tabla,
        lista
          .filter((item) => item.constraint_type === "p")
          .map((item) => item.definition),
      ]),
    );
    expect(primaryKeys.get("profiles")).toEqual(["PRIMARY KEY (id)"]);
    expect(primaryKeys.get("asignaciones")).toEqual([
      "PRIMARY KEY (trabajadera_id, costalero_id)",
    ]);
    expect(primaryKeys.get("relevos")).toEqual([
      "PRIMARY KEY (plan_id, tramo_id, costalero_id)",
    ]);

    const uniqueDefinitions = constraints.rows
      .filter((item) => item.constraint_type === "u")
      .map((item) => item.definition)
      .sort();
    expect(uniqueDefinitions).toEqual([
      'UNIQUE (paso_id, "position")',
      "UNIQUE (paso_id, ordinal)",
      "UNIQUE (paso_id, version)",
    ]);

    const checkDefinitions = constraints.rows
      .filter((item) => item.constraint_type === "c")
      .map((item) => item.definition)
      .sort();
    expect(checkDefinitions).toEqual(
      [
        "CHECK ((role = ANY (ARRAY['capataz'::text, 'costalero'::text])))",
        "CHECK ((kind = ANY (ARRAY['salida'::text, 'normal'::text, 'entrada'::text])))",
        "CHECK ((estado = ANY (ARRAY['en_paso'::text, 'descanso'::text])))",
        "CHECK ((status = ANY (ARRAY['borrador'::text, 'publicado'::text])))",
        "CHECK (((carga >= 1) AND (carga <= 5)))",
        "CHECK (((num_trabajaderas >= 1) AND (num_trabajaderas <= 12)))",
        "CHECK ((ordinal >= 1))",
        'CHECK (("position" >= 1))',
      ].sort(),
    );

    const foreignKeys = constraints.rows
      .filter((item) => item.constraint_type === "f")
      .map((item) => item.definition)
      .sort();
    expect(foreignKeys).toHaveLength(14);
    expect(
      foreignKeys.some((definition) =>
        definition.includes("FOREIGN KEY (profile_id) REFERENCES profiles(id)"),
      ),
    ).toBe(true);
    expect(
      foreignKeys.some((definition) =>
        definition.includes("FOREIGN KEY (owner_id) REFERENCES profiles(id)"),
      ),
    ).toBe(true);
    expect(
      foreignKeys.some((definition) =>
        definition.includes("FOREIGN KEY (created_by) REFERENCES profiles(id)"),
      ),
    ).toBe(true);
    expect(
      foreignKeys.some((definition) =>
        definition.includes(
          "FOREIGN KEY (costalero_id) REFERENCES costaleros(id)",
        ),
      ),
    ).toBe(true);
  });
});

import type { PGlite } from "@electric-sql/pglite";

export const IDS = {
  capatazA: "10000000-0000-4000-8000-000000000001",
  capatazB: "10000000-0000-4000-8000-000000000002",
  cuadrillaA: "20000000-0000-4000-8000-000000000001",
  cuadrillaB: "20000000-0000-4000-8000-000000000002",
  pasoA: "30000000-0000-4000-8000-000000000001",
  pasoB: "30000000-0000-4000-8000-000000000002",
  costaleroA: "40000000-0000-4000-8000-000000000001",
  costaleroB: "40000000-0000-4000-8000-000000000002",
  costaleroC: "40000000-0000-4000-8000-000000000003",
  trabajaderaA: "50000000-0000-4000-8000-000000000001",
  tramoA: "60000000-0000-4000-8000-000000000001",
  planBorrador: "70000000-0000-4000-8000-000000000001",
  planPublicado: "70000000-0000-4000-8000-000000000002",
} as const;

export async function crearFixturesBasicos(db: PGlite): Promise<void> {
  await db.query(
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ($1, 'capataz-a@example.test', '{}'::jsonb),
        ($2, 'capataz-b@example.test', '{}'::jsonb),
        ($3, 'costalero-a@example.test', '{}'::jsonb),
        ($4, 'costalero-b@example.test', '{}'::jsonb),
        ($5, 'costalero-c@example.test', '{}'::jsonb)
      on conflict (id) do nothing
    `,
    [
      IDS.capatazA,
      IDS.capatazB,
      IDS.costaleroA,
      IDS.costaleroB,
      IDS.costaleroC,
    ],
  );

  await db.query(
    `
      insert into profiles (id, full_name, role)
      values
        ($1, 'Capataz A', 'capataz'),
        ($2, 'Capataz B', 'capataz'),
        ($3, 'Costalero A', 'costalero'),
        ($4, 'Costalero B', 'costalero'),
        ($5, 'Costalero C', 'costalero')
      on conflict (id) do update
      set full_name = excluded.full_name, role = excluded.role
    `,
    [
      IDS.capatazA,
      IDS.capatazB,
      IDS.costaleroA,
      IDS.costaleroB,
      IDS.costaleroC,
    ],
  );

  await db.query(
    `
      insert into cuadrillas (id, name, season, owner_id)
      values
        ($1, 'Cuadrilla A', 2025, $2),
        ($3, 'Cuadrilla B', 2025, $4)
    `,
    [IDS.cuadrillaA, IDS.capatazA, IDS.cuadrillaB, IDS.capatazB],
  );

  await db.query(
    `
      insert into costaleros (id, cuadrilla_id, full_name)
      values
        ($1, $4, 'Costalero A'),
        ($2, $4, 'Costalero B'),
        ($3, $5, 'Costalero C')
    `,
    [
      IDS.costaleroA,
      IDS.costaleroB,
      IDS.costaleroC,
      IDS.cuadrillaA,
      IDS.cuadrillaB,
    ],
  );

  await db.query(
    `
      insert into pasos (id, cuadrilla_id, name, season, num_trabajaderas)
      values
        ($1, $2, 'Paso A', 2025, 1),
        ($3, $4, 'Paso B', 2025, 1)
    `,
    [IDS.pasoA, IDS.cuadrillaA, IDS.pasoB, IDS.cuadrillaB],
  );
}

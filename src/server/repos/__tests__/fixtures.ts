import type { PGlite } from "@electric-sql/pglite";

export const IDS = {
  capatazA: "10000000-0000-4000-8000-000000000001",
  capatazB: "10000000-0000-4000-8000-000000000002",
  cuadrillaA: "20000000-0000-4000-8000-000000000001",
  cuadrillaB: "20000000-0000-4000-8000-000000000002",
  pasoA: "30000000-0000-4000-8000-000000000001",
  pasoB: "30000000-0000-4000-8000-000000000002",
  // Identidad de la cuenta (auth.users / profiles) del costalero.
  costaleroA: "40000000-0000-4000-8000-000000000001",
  costaleroB: "40000000-0000-4000-8000-000000000002",
  costaleroC: "40000000-0000-4000-8000-000000000003",
  // Identidad de la FILA en costaleros. Es distinta de la cuenta a propósito:
  // §10 ancla la pertenencia en costaleros.profile_id, no en costaleros.id.
  filaCostaleroA: "90000000-0000-4000-8000-000000000001",
  filaCostaleroB: "90000000-0000-4000-8000-000000000002",
  filaCostaleroC: "90000000-0000-4000-8000-000000000003",
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
      insert into costaleros (id, profile_id, cuadrilla_id, full_name)
      values
        ($1, $4, $6, 'Costalero A'),
        ($2, $5, $6, 'Costalero B'),
        -- El costalero C todavia no tiene cuenta: lo dio de alta el capataz.
        ($3, null, $7, 'Costalero C')
    `,
    [
      IDS.filaCostaleroA,
      IDS.filaCostaleroB,
      IDS.filaCostaleroC,
      IDS.costaleroA,
      IDS.costaleroB,
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

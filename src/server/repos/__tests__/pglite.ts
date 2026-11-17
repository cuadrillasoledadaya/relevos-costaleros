import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const DIRECTORIO_ACTUAL = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_REPOSITORIO = path.resolve(DIRECTORIO_ACTUAL, "../../../..");

export type Actor = "anon" | "authenticated" | "service_role";

export async function crearPgliteDePrueba(
  opciones: { aplicarSeed?: boolean } = {},
): Promise<PGlite> {
  const db = await PGlite.create();

  await db.exec(`
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb,
      raw_app_meta_data jsonb,
      instance_id uuid,
      aud text,
      role text,
      email_confirmed_at timestamptz,
      confirmation_token text,
      recovery_token text,
      email_change_token_new text,
      email_change text,
      phone_change_token text,
      phone_change text,
      reauthentication_token text,
      email_change_token_current text,
      email_change_confirm_status smallint default 0,
      encrypted_password text,
      last_sign_in_at timestamptz,
      created_at timestamptz,
      updated_at timestamptz
    );
    -- GoTrue guarda una identidad por cuenta: sin esta tabla el login falla.
    create table auth.identities (
      id uuid primary key,
      user_id uuid not null references auth.users(id) on delete cascade,
      provider_id text not null,
      identity_data jsonb not null,
      provider text not null,
      email text,
      last_sign_in_at timestamptz,
      created_at timestamptz,
      updated_at timestamptz,
      unique (provider_id, provider)
    );
    create or replace function auth.uid() returns uuid language sql stable as $$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )::uuid
    $$;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);

  const migraciones = await leerMigraciones();
  for (const migracion of migraciones) {
    await db.exec(migracion.sql);
  }

  if (opciones.aplicarSeed) {
    const seed = await readFile(
      path.join(RAIZ_REPOSITORIO, "supabase/seed.sql"),
      "utf8",
    );
    await db.exec(seed);
  }

  return db;
}

export async function establecerActor(
  db: PGlite,
  rol: Actor,
  sub?: string,
): Promise<void> {
  await db.exec(`set role ${rol}`);
  if (sub !== undefined) {
    await db.query("select set_config('request.jwt.claims', $1, false)", [
      JSON.stringify({ sub }),
    ]);
  } else {
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

export async function restaurarRol(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', '', false)");
}

async function leerMigraciones(): Promise<
  Array<{ archivo: string; sql: string }>
> {
  const directorio = path.join(RAIZ_REPOSITORIO, "supabase/migrations");
  const archivos = (await readdir(directorio))
    .filter((archivo) => archivo.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    archivos.map(async (archivo) => ({
      archivo,
      sql: await readFile(path.join(directorio, archivo), "utf8"),
    })),
  );
}

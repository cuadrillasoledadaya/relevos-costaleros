import { cargarModuloSupabase } from "./loader";
import type { SupabaseClientLike } from "./types";

type ModuloSupabase = {
  createClient: (
    url: string,
    serviceRoleKey: string,
    options: {
      auth: {
        autoRefreshToken: false;
        persistSession: false;
      };
    },
  ) => SupabaseClientLike;
};

/**
 * Cliente administrativo para operaciones de servidor explícitamente justificadas.
 * La service role nunca debe importarse desde componentes, hooks o middleware.
 */
export async function createAdminSupabaseClient(): Promise<SupabaseClientLike> {
  if (typeof window !== "undefined") {
    throw new Error(
      "El cliente administrativo de Supabase solo puede usarse en el servidor.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para crear el cliente administrativo de Supabase.",
    );
  }

  const modulo = (await cargarModuloSupabase(
    "@supabase/supabase-js",
  )) as ModuloSupabase;
  return modulo.createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

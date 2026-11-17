import { cargarModuloSupabase } from "./loader";
import type { SupabaseClientLike } from "./types";

type ModuloSsr = {
  createBrowserClient: (url: string, anonKey: string) => SupabaseClientLike;
};

let clienteCacheado: Promise<SupabaseClientLike> | undefined;

/** Crea el cliente de Supabase para el navegador con la clave anónima. */
export function createBrowserSupabaseClient(): Promise<SupabaseClientLike> {
  if (clienteCacheado) {
    return clienteCacheado;
  }

  clienteCacheado = crearCliente();
  return clienteCacheado;
}

async function crearCliente(): Promise<SupabaseClientLike> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY para crear el cliente de Supabase.",
    );
  }

  const modulo = (await cargarModuloSupabase("@supabase/ssr")) as ModuloSsr;
  return modulo.createBrowserClient(url, anonKey);
}

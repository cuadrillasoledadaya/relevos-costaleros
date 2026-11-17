import { cookies } from "next/headers";
import { cargarModuloSupabase } from "./loader";
import type { CookieOptions, SupabaseClientLike } from "./types";

type CookieParaEstablecer = {
  name: string;
  value: string;
  options?: CookieOptions;
};

type ModuloSsr = {
  createServerClient: (
    url: string,
    anonKey: string,
    options: {
      cookies: {
        getAll(): Array<{ name: string; value: string }>;
        setAll(cookies: CookieParaEstablecer[]): void;
      };
    },
  ) => SupabaseClientLike;
};

/**
 * Crea un cliente ligado a la sesión de la petición. La clave es siempre la
 * anónima: las cookies y el JWT transportan los permisos, nunca la service role.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClientLike> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY para crear el cliente de Supabase.",
    );
  }

  const cookieStore = await cookies();
  const modulo = (await cargarModuloSupabase("@supabase/ssr")) as ModuloSsr;

  return modulo.createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaEstablecer) {
        try {
          for (const cookie of cookiesParaEstablecer) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Server Components no pueden escribir cookies. El middleware refresca
          // la sesión y Server Actions sí pueden ejecutar esta escritura.
        }
      },
    },
  });
}

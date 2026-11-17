import { NextResponse, type NextRequest } from "next/server";
import { cargarModuloSupabase } from "./loader";
import type { CookieOptions, SupabaseClientLike, SupabaseUser } from "./types";

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

export type SessionActualizada = {
  response: NextResponse;
  user: SupabaseUser | null;
};

/**
 * Refresca la sesión de Supabase y propaga sus cookies a la respuesta.
 * La protección de rutas se aplica en el middleware que consume este helper.
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionActualizada> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY para actualizar la sesión de Supabase.",
    );
  }

  let response = NextResponse.next({ request });
  const modulo = (await cargarModuloSupabase("@supabase/ssr")) as ModuloSsr;
  const supabase = modulo.createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaEstablecer) {
        for (const cookie of cookiesParaEstablecer) {
          request.cookies.set(cookie.name, cookie.value);
        }
        response = NextResponse.next({ request });
        for (const cookie of cookiesParaEstablecer) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

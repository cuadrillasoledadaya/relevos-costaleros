type NombreModuloSupabase = "@supabase/ssr" | "@supabase/supabase-js";

/**
 * Carga perezosa del cliente oficial.
 *
 * El especificador va LITERAL en cada rama a propósito: si el módulo se pide
 * con una variable, webpack no puede analizar la llamada y la compila a un
 * contexto vacío que lanza "Cannot find module '@supabase/ssr'" en runtime. En
 * los tests (vitest no empaqueta) el import dinámico nativo sí funcionaba, así
 * que el fallo sólo aparecía en el bundle de producción.
 *
 * Las dos dependencias son obligatorias en runtime (`@supabase/ssr` y
 * `@supabase/supabase-js` están en `dependencies`).
 */
export async function cargarModuloSupabase(
  nombre: NombreModuloSupabase,
): Promise<unknown> {
  if (nombre === "@supabase/ssr") {
    return await import("@supabase/ssr");
  }
  return await import("@supabase/supabase-js");
}

type NombreModuloSupabase = "@supabase/ssr" | "@supabase/supabase-js";

/**
 * Carga perezosa de un cliente oficial cuando el proyecto incorpore la dependencia.
 * Se evita una importación estática para que el typecheck del repositorio no requiera
 * una dependencia ausente; la dependencia oficial sigue siendo obligatoria en runtime.
 */
export async function cargarModuloSupabase(
  nombre: NombreModuloSupabase,
): Promise<unknown> {
  const especificacion: string = nombre;
  return import(especificacion);
}

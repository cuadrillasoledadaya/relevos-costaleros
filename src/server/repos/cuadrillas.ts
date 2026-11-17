import {
  cuadrillaActualizacionSchema,
  cuadrillaSchema,
  type CuadrillaActualizacionInput,
  type CuadrillaInput,
} from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Cuadrilla = {
  id: string;
  name: string;
  season: number;
  owner_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FiltroCuadrillas = {
  ownerId?: string;
};

export type RepositorioCuadrillas = {
  listar(
    filtro?: FiltroCuadrillas,
  ): Promise<ResultadoListaRepositorio<Cuadrilla>>;
  obtenerPorId(id: string): Promise<ResultadoRepositorio<Cuadrilla>>;
  crear(entrada: CuadrillaInput): Promise<ResultadoRepositorio<Cuadrilla>>;
  actualizar(
    id: string,
    cambios: CuadrillaActualizacionInput,
  ): Promise<ResultadoRepositorio<Cuadrilla>>;
  eliminar(id: string): Promise<ResultadoRepositorio<{ id: string }>>;
};

export function crearRepositorioCuadrillas(
  client: SupabaseClientLike,
): RepositorioCuadrillas {
  return {
    /** Lee la tabla cuadrillas, opcionalmente filtrada por propietario. */
    listar(filtro = {}) {
      let consulta = client.from<Cuadrilla>("cuadrillas").select("*");
      if (filtro.ownerId !== undefined) {
        consulta = consulta.eq("owner_id", filtro.ownerId);
      }
      return resultadoDeConsulta(consulta.order("name", { ascending: true }));
    },

    /** Lee una fila de cuadrillas por su id. */
    obtenerPorId(id) {
      return resultadoDeFila(
        client
          .from<Cuadrilla>("cuadrillas")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
      );
    },

    /** Inserta una fila en cuadrillas después de validar la entrada. */
    crear(entrada) {
      const validacion = cuadrillaSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Cuadrilla>("cuadrillas")
          .insert(validacion.data)
          .select("*")
          .single(),
      );
    },

    /** Actualiza una fila existente de cuadrillas. */
    actualizar(id, cambios) {
      const validacion = cuadrillaActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Cuadrilla>("cuadrillas")
          .update(validacion.data)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de cuadrillas por su id. */
    eliminar(id) {
      return resultadoDeFila(
        client
          .from<Cuadrilla>("cuadrillas")
          .delete()
          .eq("id", id)
          .select("id")
          .single(),
      );
    },
  };
}

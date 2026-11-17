import {
  pasoActualizacionSchema,
  pasoSchema,
  type PasoActualizacionInput,
  type PasoInput,
} from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Paso = {
  id: string;
  cuadrilla_id: string;
  name: string;
  season: number;
  num_trabajaderas: number;
  created_at: string;
  updated_at: string;
};

export type RepositorioPasos = {
  listarPorCuadrilla(
    cuadrillaId: string,
  ): Promise<ResultadoListaRepositorio<Paso>>;
  obtenerPorId(id: string): Promise<ResultadoRepositorio<Paso>>;
  crear(entrada: PasoInput): Promise<ResultadoRepositorio<Paso>>;
  actualizar(
    id: string,
    cambios: PasoActualizacionInput,
  ): Promise<ResultadoRepositorio<Paso>>;
  eliminar(id: string): Promise<ResultadoRepositorio<{ id: string }>>;
};

export function crearRepositorioPasos(
  client: SupabaseClientLike,
): RepositorioPasos {
  return {
    /** Lee la tabla pasos de una cuadrilla. */
    listarPorCuadrilla(cuadrillaId) {
      return resultadoDeConsulta(
        client
          .from<Paso>("pasos")
          .select("*")
          .eq("cuadrilla_id", cuadrillaId)
          .order("name", { ascending: true }),
      );
    },

    /** Lee una fila de pasos por su id. */
    obtenerPorId(id) {
      return resultadoDeFila(
        client.from<Paso>("pasos").select("*").eq("id", id).maybeSingle(),
      );
    },

    /** Inserta una fila en pasos después de validar la entrada. */
    crear(entrada) {
      const validacion = pasoSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client.from<Paso>("pasos").insert(validacion.data).select("*").single(),
      );
    },

    /** Actualiza una fila existente de pasos. */
    actualizar(id, cambios) {
      const validacion = pasoActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Paso>("pasos")
          .update(validacion.data)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de pasos por su id. */
    eliminar(id) {
      return resultadoDeFila(
        client.from<Paso>("pasos").delete().eq("id", id).select("id").single(),
      );
    },
  };
}

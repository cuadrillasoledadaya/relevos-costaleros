import {
  trabajaderaActualizacionSchema,
  trabajaderaSchema,
  type TrabajaderaActualizacionInput,
  type TrabajaderaInput,
} from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Trabajadora = {
  id: string;
  paso_id: string;
  position: number;
  carga: number;
};

export type RepositorioTrabajaderas = {
  listarPorPaso(
    pasoId: string,
  ): Promise<ResultadoListaRepositorio<Trabajadora>>;
  obtenerPorId(id: string): Promise<ResultadoRepositorio<Trabajadora>>;
  crear(entrada: TrabajaderaInput): Promise<ResultadoRepositorio<Trabajadora>>;
  actualizar(
    id: string,
    cambios: TrabajaderaActualizacionInput,
  ): Promise<ResultadoRepositorio<Trabajadora>>;
  eliminar(id: string): Promise<ResultadoRepositorio<{ id: string }>>;
};

export function crearRepositorioTrabajaderas(
  client: SupabaseClientLike,
): RepositorioTrabajaderas {
  return {
    /** Lee la tabla trabajaderas de un paso, ordenada por posición. */
    listarPorPaso(pasoId) {
      return resultadoDeConsulta(
        client
          .from<Trabajadora>("trabajaderas")
          .select("*")
          .eq("paso_id", pasoId)
          .order("position", { ascending: true }),
      );
    },

    /** Lee una fila de trabajaderas por su id. */
    obtenerPorId(id) {
      return resultadoDeFila(
        client
          .from<Trabajadora>("trabajaderas")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
      );
    },

    /** Inserta una fila en trabajaderas después de validar la entrada. */
    crear(entrada) {
      const validacion = trabajaderaSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Trabajadora>("trabajaderas")
          .insert(validacion.data)
          .select("*")
          .single(),
      );
    },

    /** Actualiza una fila existente de trabajaderas. */
    actualizar(id, cambios) {
      const validacion = trabajaderaActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Trabajadora>("trabajaderas")
          .update(validacion.data)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de trabajaderas por su id. */
    eliminar(id) {
      return resultadoDeFila(
        client
          .from<Trabajadora>("trabajaderas")
          .delete()
          .eq("id", id)
          .select("id")
          .single(),
      );
    },
  };
}

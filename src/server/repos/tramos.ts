import {
  tramoActualizacionSchema,
  tramoSchema,
  type TramoActualizacionInput,
  type TramoInput,
} from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Tramo = {
  id: string;
  paso_id: string;
  name: string;
  ordinal: number;
  kind: "salida" | "normal" | "entrada";
};

export type RepositorioTramos = {
  listarPorPaso(pasoId: string): Promise<ResultadoListaRepositorio<Tramo>>;
  obtenerPorId(id: string): Promise<ResultadoRepositorio<Tramo>>;
  crear(entrada: TramoInput): Promise<ResultadoRepositorio<Tramo>>;
  actualizar(
    id: string,
    cambios: TramoActualizacionInput,
  ): Promise<ResultadoRepositorio<Tramo>>;
  eliminar(id: string): Promise<ResultadoRepositorio<{ id: string }>>;
};

export function crearRepositorioTramos(
  client: SupabaseClientLike,
): RepositorioTramos {
  return {
    /** Lee la tabla tramos de un paso, ordenada por ordinal. */
    listarPorPaso(pasoId) {
      return resultadoDeConsulta(
        client
          .from<Tramo>("tramos")
          .select("*")
          .eq("paso_id", pasoId)
          .order("ordinal", { ascending: true }),
      );
    },

    /** Lee una fila de tramos por su id. */
    obtenerPorId(id) {
      return resultadoDeFila(
        client.from<Tramo>("tramos").select("*").eq("id", id).maybeSingle(),
      );
    },

    /** Inserta una fila en tramos después de validar la entrada. */
    crear(entrada) {
      const validacion = tramoSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Tramo>("tramos")
          .insert(validacion.data)
          .select("*")
          .single(),
      );
    },

    /** Actualiza una fila existente de tramos. */
    actualizar(id, cambios) {
      const validacion = tramoActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Tramo>("tramos")
          .update(validacion.data)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de tramos por su id. */
    eliminar(id) {
      return resultadoDeFila(
        client
          .from<Tramo>("tramos")
          .delete()
          .eq("id", id)
          .select("id")
          .single(),
      );
    },
  };
}

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
  eliminar(id: string): Promise<ResultadoListaRepositorio<Tramo>>;
  /**
   * Añade un tramo al final del recorrido (en una sola transacción) y
   * recalcula los tipos canónicos: el primero `salida`, el último `entrada`.
   */
  anexar(
    pasoId: string,
    nombre: string,
  ): Promise<ResultadoListaRepositorio<Tramo>>;
  /**
   * Reordena los tramos del paso de forma transaccional: `orden` es la lista
   * de ids en el orden nuevo. No deja ordinales repetidos ni huecos y
   * recalcula los tipos canónicos (el primero `salida`, el último `entrada`).
   */
  reordenar(
    pasoId: string,
    orden: string[],
  ): Promise<ResultadoListaRepositorio<Tramo>>;
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

    /**
     * Borra un tramo del recorrido. Lo hace la función `borrar_tramo`: borra y
     * renumera en la misma transacción, así que nunca quedan huecos.
     */
    eliminar(id) {
      return resultadoDeConsulta(
        client.rpc<Tramo[]>("borrar_tramo", { p_tramo_id: id }),
      );
    },

    /**
     * Añade un tramo al final del recorrido con la función `anexar_tramo`: el
     * alta y el recálculo de los tipos ocurren en la misma transacción.
     */
    anexar(pasoId, nombre) {
      return resultadoDeConsulta(
        client.rpc<Tramo[]>("anexar_tramo", {
          p_paso_id: pasoId,
          p_nombre: nombre,
        }),
      );
    },

    /**
     * Reordena los tramos del paso con la función `reordenar_tramos`: el
     * cambio es atómico y recalcula los tipos canónicos del recorrido.
     *
     * Los nombres de los argumentos son los de la función (`p_paso_id`,
     * `p_orden`): PostgREST busca la firma por sus argumentos.
     */
    reordenar(pasoId, orden) {
      return resultadoDeConsulta(
        client.rpc<Tramo[]>("reordenar_tramos", {
          p_paso_id: pasoId,
          p_orden: orden,
        }),
      );
    },
  };
}

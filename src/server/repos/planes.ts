import {
  planActualizacionSchema,
  planSchema,
  type PlanActualizacionInput,
  type PlanInput,
} from "../../lib/schemas";
import type { JsonValue } from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Plan = {
  id: string;
  paso_id: string;
  version: number;
  status: "borrador" | "publicado";
  seed: number;
  solver_version: string;
  stats: JsonValue | null;
  created_by: string | null;
  created_at: string;
};

export type FiltroPlanes = {
  pasoId: string;
  status?: Plan["status"];
};

export type RepositorioPlanes = {
  listar(filtro: FiltroPlanes): Promise<ResultadoListaRepositorio<Plan>>;
  obtenerPorId(id: string): Promise<ResultadoRepositorio<Plan>>;
  crear(entrada: PlanInput): Promise<ResultadoRepositorio<Plan>>;
  /**
   * Guarda un plan y sus relevos en una sola transacción (`guardar_plan`).
   * La versión la calcula la base de datos y el plan empieza como `borrador`.
   */
  guardar(
    pasoId: string,
    entrada: {
      seed: number;
      solverVersion: string;
      stats: unknown;
      relevos: Array<{
        tramoId: string;
        costaleroId: string;
        estado: "en_paso" | "descanso";
      }>;
    },
  ): Promise<ResultadoRepositorio<Plan>>;
  actualizar(
    id: string,
    cambios: PlanActualizacionInput,
  ): Promise<ResultadoRepositorio<Plan>>;
  eliminar(id: string): Promise<ResultadoRepositorio<{ id: string }>>;
};

export function crearRepositorioPlanes(
  client: SupabaseClientLike,
): RepositorioPlanes {
  return {
    /** Lee la tabla planes de un paso, opcionalmente filtrada por estado. */
    listar({ pasoId, status }) {
      let consulta = client
        .from<Plan>("planes")
        .select("*")
        .eq("paso_id", pasoId);
      if (status !== undefined) {
        consulta = consulta.eq("status", status);
      }
      return resultadoDeConsulta(
        consulta.order("version", { ascending: false }),
      );
    },

    /** Lee una fila de planes por su id. */
    obtenerPorId(id) {
      return resultadoDeFila(
        client.from<Plan>("planes").select("*").eq("id", id).maybeSingle(),
      );
    },

    /** Inserta una fila en planes después de validar la entrada. */
    crear(entrada) {
      const validacion = planSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Plan>("planes")
          .insert(validacion.data)
          .select("*")
          .single(),
      );
    },

    /**
     * Guarda un plan y sus relevos en una sola transacción. La versión la
     * calcula la base de datos y el plan empieza siempre como borrador.
     *
     * Los nombres de los argumentos son los de la función (`p_paso_id`,
     * `p_seed`, `p_solver_version`, `p_stats`, `p_relevos`): PostgREST busca
     * la firma por sus argumentos.
     */
    async guardar(pasoId, entrada) {
      const resultado = await resultadoDeConsulta<Plan>(
        client.rpc<Plan[]>("guardar_plan", {
          p_paso_id: pasoId,
          p_seed: entrada.seed,
          p_solver_version: entrada.solverVersion,
          p_stats: entrada.stats,
          p_relevos: entrada.relevos.map((relevo) => ({
            tramo_id: relevo.tramoId,
            costalero_id: relevo.costaleroId,
            estado: relevo.estado,
          })),
        }),
      );
      return { data: resultado.data[0] ?? null, error: resultado.error };
    },

    /** Actualiza una fila existente de planes. */
    actualizar(id, cambios) {
      const validacion = planActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Plan>("planes")
          .update(validacion.data)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de planes por su id. */
    eliminar(id) {
      return resultadoDeFila(
        client.from<Plan>("planes").delete().eq("id", id).select("id").single(),
      );
    },
  };
}

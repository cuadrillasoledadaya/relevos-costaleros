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

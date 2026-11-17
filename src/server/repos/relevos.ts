import {
  relevoActualizacionSchema,
  relevoSchema,
  type RelevoActualizacionInput,
  type RelevoInput,
} from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Relevo = {
  plan_id: string;
  tramo_id: string;
  costalero_id: string;
  estado: "en_paso" | "descanso";
};

export type ClaveRelevo = {
  planId: string;
  tramoId: string;
  costaleroId: string;
};

export type RepositorioRelevos = {
  listarPorPlan(planId: string): Promise<ResultadoListaRepositorio<Relevo>>;
  listarPorTramo(tramoId: string): Promise<ResultadoListaRepositorio<Relevo>>;
  obtener(clave: ClaveRelevo): Promise<ResultadoRepositorio<Relevo>>;
  crear(entrada: RelevoInput): Promise<ResultadoRepositorio<Relevo>>;
  crearVarios(
    entradas: RelevoInput[],
  ): Promise<ResultadoListaRepositorio<Relevo>>;
  actualizar(
    clave: ClaveRelevo,
    cambios: RelevoActualizacionInput,
  ): Promise<ResultadoRepositorio<Relevo>>;
  eliminar(clave: ClaveRelevo): Promise<ResultadoRepositorio<Relevo>>;
};

export function crearRepositorioRelevos(
  client: SupabaseClientLike,
): RepositorioRelevos {
  return {
    /** Lee la tabla relevos de un plan. */
    listarPorPlan(planId) {
      return resultadoDeConsulta(
        client.from<Relevo>("relevos").select("*").eq("plan_id", planId),
      );
    },

    /** Lee la tabla relevos de un tramo. */
    listarPorTramo(tramoId) {
      return resultadoDeConsulta(
        client.from<Relevo>("relevos").select("*").eq("tramo_id", tramoId),
      );
    },

    /** Lee una fila de relevos por su clave compuesta. */
    obtener({ planId, tramoId, costaleroId }) {
      return resultadoDeFila(
        client
          .from<Relevo>("relevos")
          .select("*")
          .eq("plan_id", planId)
          .eq("tramo_id", tramoId)
          .eq("costalero_id", costaleroId)
          .maybeSingle(),
      );
    },

    /** Inserta una fila en relevos después de validar la entrada. */
    crear(entrada) {
      const validacion = relevoSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Relevo>("relevos")
          .insert(validacion.data)
          .select("*")
          .single(),
      );
    },

    /** Inserta varias filas en relevos después de validar cada entrada. */
    crearVarios(entradas) {
      const validadas: RelevoInput[] = [];
      for (const entrada of entradas) {
        const validacion = relevoSchema.safeParse(entrada);
        if (!validacion.success) {
          return Promise.resolve({
            data: [],
            error: errorDeValidacion(validacion.error),
          });
        }
        validadas.push(validacion.data);
      }

      if (validadas.length === 0) {
        return Promise.resolve({ data: [], error: null });
      }
      return resultadoDeConsulta(
        client.from<Relevo>("relevos").insert(validadas).select("*"),
      );
    },

    /** Actualiza el estado en una fila de relevos. */
    actualizar({ planId, tramoId, costaleroId }, cambios) {
      const validacion = relevoActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Relevo>("relevos")
          .update(validacion.data)
          .eq("plan_id", planId)
          .eq("tramo_id", tramoId)
          .eq("costalero_id", costaleroId)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de relevos por su clave compuesta. */
    eliminar({ planId, tramoId, costaleroId }) {
      return resultadoDeFila(
        client
          .from<Relevo>("relevos")
          .delete()
          .eq("plan_id", planId)
          .eq("tramo_id", tramoId)
          .eq("costalero_id", costaleroId)
          .select("*")
          .single(),
      );
    },
  };
}

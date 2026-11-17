import {
  asignacionActualizacionSchema,
  asignacionSchema,
  type AsignacionActualizacionInput,
  type AsignacionInput,
} from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Asignacion = {
  trabajadera_id: string;
  costalero_id: string;
  is_boquilla: boolean;
};

export type ClaveAsignacion = {
  trabajaderaId: string;
  costaleroId: string;
};

export type RepositorioAsignaciones = {
  listarPorTrabajadera(
    trabajaderaId: string,
  ): Promise<ResultadoListaRepositorio<Asignacion>>;
  listarPorCostalero(
    costaleroId: string,
  ): Promise<ResultadoListaRepositorio<Asignacion>>;
  obtener(clave: ClaveAsignacion): Promise<ResultadoRepositorio<Asignacion>>;
  crear(entrada: AsignacionInput): Promise<ResultadoRepositorio<Asignacion>>;
  actualizar(
    clave: ClaveAsignacion,
    cambios: AsignacionActualizacionInput,
  ): Promise<ResultadoRepositorio<Asignacion>>;
  eliminar(clave: ClaveAsignacion): Promise<ResultadoRepositorio<Asignacion>>;
};

export function crearRepositorioAsignaciones(
  client: SupabaseClientLike,
): RepositorioAsignaciones {
  return {
    /** Lee las filas de asignaciones de una trabajadera. */
    listarPorTrabajadera(trabajaderaId) {
      return resultadoDeConsulta(
        client
          .from<Asignacion>("asignaciones")
          .select("*")
          .eq("trabajadera_id", trabajaderaId),
      );
    },

    /** Lee las filas de asignaciones de un costalero. */
    listarPorCostalero(costaleroId) {
      return resultadoDeConsulta(
        client
          .from<Asignacion>("asignaciones")
          .select("*")
          .eq("costalero_id", costaleroId),
      );
    },

    /** Lee una fila de asignaciones por su clave compuesta. */
    obtener({ trabajaderaId, costaleroId }) {
      return resultadoDeFila(
        client
          .from<Asignacion>("asignaciones")
          .select("*")
          .eq("trabajadera_id", trabajaderaId)
          .eq("costalero_id", costaleroId)
          .maybeSingle(),
      );
    },

    /** Inserta una fila en asignaciones después de validar la entrada. */
    crear(entrada) {
      const validacion = asignacionSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Asignacion>("asignaciones")
          .insert(validacion.data)
          .select("*")
          .single(),
      );
    },

    /** Actualiza is_boquilla en una fila de asignaciones. */
    actualizar({ trabajaderaId, costaleroId }, cambios) {
      const validacion = asignacionActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Asignacion>("asignaciones")
          .update(validacion.data)
          .eq("trabajadera_id", trabajaderaId)
          .eq("costalero_id", costaleroId)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de asignaciones por su clave compuesta. */
    eliminar({ trabajaderaId, costaleroId }) {
      return resultadoDeFila(
        client
          .from<Asignacion>("asignaciones")
          .delete()
          .eq("trabajadera_id", trabajaderaId)
          .eq("costalero_id", costaleroId)
          .select("*")
          .single(),
      );
    },
  };
}

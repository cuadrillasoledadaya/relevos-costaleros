import {
  costaleroActualizacionSchema,
  costaleroSchema,
  type CostaleroActualizacionInput,
  type CostaleroInput,
} from "../../lib/schemas";
import type { SupabaseClientLike } from "../supabase/types";
import {
  errorDeValidacion,
  resultadoDeConsulta,
  resultadoDeFila,
  type ResultadoListaRepositorio,
  type ResultadoRepositorio,
} from "./base";

export type Costalero = {
  id: string;
  cuadrilla_id: string;
  /** Cuenta del costalero (§10). Null mientras no tenga cuenta propia. */
  profile_id: string | null;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FiltroCostaleros = {
  cuadrillaId: string;
  active?: boolean;
};

export type RepositorioCostaleros = {
  listarPorCuadrilla(
    cuadrillaId: string,
    filtro?: { active?: boolean },
  ): Promise<ResultadoListaRepositorio<Costalero>>;
  obtenerPorId(id: string): Promise<ResultadoRepositorio<Costalero>>;
  crear(entrada: CostaleroInput): Promise<ResultadoRepositorio<Costalero>>;
  actualizar(
    id: string,
    cambios: CostaleroActualizacionInput,
  ): Promise<ResultadoRepositorio<Costalero>>;
  eliminar(id: string): Promise<ResultadoRepositorio<{ id: string }>>;
};

export function crearRepositorioCostaleros(
  client: SupabaseClientLike,
): RepositorioCostaleros {
  return {
    /** Lee la tabla costaleros de una cuadrilla. */
    listarPorCuadrilla(cuadrillaId, filtro = {}) {
      let consulta = client
        .from<Costalero>("costaleros")
        .select("*")
        .eq("cuadrilla_id", cuadrillaId);
      if (filtro.active !== undefined) {
        consulta = consulta.eq("active", filtro.active);
      }
      return resultadoDeConsulta(
        consulta.order("full_name", { ascending: true }),
      );
    },

    /** Lee una fila de costaleros por su id. */
    obtenerPorId(id) {
      return resultadoDeFila(
        client
          .from<Costalero>("costaleros")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
      );
    },

    /** Inserta una fila en costaleros después de validar la entrada. */
    crear(entrada) {
      const validacion = costaleroSchema.safeParse(entrada);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Costalero>("costaleros")
          .insert(validacion.data)
          .select("*")
          .single(),
      );
    },

    /** Actualiza una fila existente de costaleros. */
    actualizar(id, cambios) {
      const validacion = costaleroActualizacionSchema.safeParse(cambios);
      if (!validacion.success) {
        return Promise.resolve({
          data: null,
          error: errorDeValidacion(validacion.error),
        });
      }
      return resultadoDeFila(
        client
          .from<Costalero>("costaleros")
          .update(validacion.data)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
      );
    },

    /** Elimina una fila de costaleros por su id. */
    eliminar(id) {
      return resultadoDeFila(
        client
          .from<Costalero>("costaleros")
          .delete()
          .eq("id", id)
          .select("id")
          .single(),
      );
    },
  };
}

import type { DbError, QueryResult, SingleResult } from "../supabase/types";
import type { SchemaError } from "../../lib/schemas";

export type ResultadoRepositorio<T> = {
  data: T | null;
  error: DbError | null;
};

export type ResultadoListaRepositorio<T> = {
  data: T[];
  error: DbError | null;
};

export function errorDeValidacion(error: SchemaError): DbError {
  return {
    message: error.issues.map((issue) => issue.message).join("; "),
    code: "VALIDATION_ERROR",
    details: JSON.stringify(error.issues),
  };
}

export function errorDesconocido(error: unknown): DbError {
  return {
    message: error instanceof Error ? error.message : String(error),
    code: "REPOSITORY_ERROR",
  };
}

export async function resultadoDeConsulta<T>(
  consulta: PromiseLike<QueryResult<T>>,
): Promise<ResultadoListaRepositorio<T>> {
  try {
    const resultado = await consulta;
    return { data: resultado.data ?? [], error: resultado.error };
  } catch (error) {
    return { data: [], error: errorDesconocido(error) };
  }
}

export async function resultadoDeFila<T>(
  consulta: Promise<SingleResult<T>>,
): Promise<ResultadoRepositorio<T>> {
  try {
    const resultado = await consulta;
    return { data: resultado.data, error: resultado.error };
  } catch (error) {
    return { data: null, error: errorDesconocido(error) };
  }
}

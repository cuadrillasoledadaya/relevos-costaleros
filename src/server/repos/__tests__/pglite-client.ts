import type { PGlite } from "@electric-sql/pglite";
import type {
  DbError,
  QueryResult,
  RpcResult,
  SupabaseClientLike,
  TableClient,
} from "../../supabase/types";

type Modo = "select" | "insert" | "update" | "delete";
type Condicion = { columna: string; valor: unknown };

const TABLAS_PERMITIDAS = new Set([
  "profiles",
  "cuadrillas",
  "costaleros",
  "pasos",
  "trabajaderas",
  "asignaciones",
  "tramos",
  "planes",
  "relevos",
]);

/**
 * Funciones de la base de datos que el doble sabe llamar, con sus argumentos
 * en el orden en que los declara la función.
 */
const FUNCIONES_PERMITIDAS: Record<
  string,
  Array<{ nombre: string; tipo: string }>
> = {
  reordenar_tramos: [
    { nombre: "p_paso_id", tipo: "uuid" },
    { nombre: "p_orden", tipo: "uuid[]" },
  ],
  anexar_tramo: [
    { nombre: "p_paso_id", tipo: "uuid" },
    { nombre: "p_nombre", tipo: "text" },
  ],
  borrar_tramo: [{ nombre: "p_tramo_id", tipo: "uuid" }],
  actualizar_tramo: [
    { nombre: "p_tramo_id", tipo: "uuid" },
    { nombre: "p_nombre", tipo: "text" },
    { nombre: "p_tipo", tipo: "text" },
  ],
  guardar_plan: [
    { nombre: "p_paso_id", tipo: "uuid" },
    { nombre: "p_seed", tipo: "bigint" },
    { nombre: "p_solver_version", tipo: "text" },
    { nombre: "p_stats", tipo: "jsonb" },
    { nombre: "p_relevos", tipo: "jsonb" },
  ],
};

function errorPglite(error: unknown): DbError {
  const mensaje = error instanceof Error ? error.message : String(error);
  return { message: mensaje, code: "PGLITE_ERROR" };
}

function identificadorSeguro(valor: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(valor)) {
    throw new Error(`Identificador SQL no permitido: ${valor}`);
  }
  return `"${valor}"`;
}

/** Literal de array de Postgres para pasar un array de ids por parámetro. */
function literalArray(valores: readonly unknown[]): string {
  return `{${valores.map((valor) => `"${String(valor)}"`).join(",")}}`;
}

/** Prepara un argumento RPC para que su cast de Postgres reciba el valor. */
function valorRpc(tipo: string, valor: unknown): unknown {
  if (tipo === "jsonb") {
    const json = JSON.stringify(valor);
    return json === undefined ? "null" : json;
  }
  if (tipo.endsWith("[]")) {
    return literalArray(Array.isArray(valor) ? valor : []);
  }
  return valor;
}

class PgliteTableClient<T> implements TableClient<T> {
  private modo: Modo = "select";
  private condiciones: Condicion[] = [];
  private orden: { columna: string; ascendente: boolean } | undefined;
  private limite: number | undefined;
  private valores: Partial<T> | Partial<T>[] = [];

  constructor(
    private readonly db: PGlite,
    private readonly tabla: string,
  ) {
    if (!TABLAS_PERMITIDAS.has(tabla)) {
      throw new Error(`Tabla no permitida en el doble de prueba: ${tabla}`);
    }
  }

  select(columnas?: string): TableClient<T> {
    void columnas;
    return this;
  }

  insert(valores: Partial<T> | Partial<T>[]): TableClient<T> {
    this.modo = "insert";
    this.valores = valores;
    return this;
  }

  update(valores: Partial<T>): TableClient<T> {
    this.modo = "update";
    this.valores = valores;
    return this;
  }

  delete(): TableClient<T> {
    this.modo = "delete";
    return this;
  }

  eq(columna: string, valor: unknown): TableClient<T> {
    this.condiciones.push({ columna, valor });
    return this;
  }

  order(
    columna: string,
    opciones: { ascending?: boolean } = {},
  ): TableClient<T> {
    this.orden = { columna, ascendente: opciones.ascending ?? true };
    return this;
  }

  limit(cantidad: number): TableClient<T> {
    this.limite = cantidad;
    return this;
  }

  async single(): Promise<{ data: T | null; error: DbError | null }> {
    const resultado = await this.ejecutar();
    if (resultado.error) {
      return { data: null, error: resultado.error };
    }
    if ((resultado.data?.length ?? 0) !== 1) {
      return {
        data: null,
        error: {
          message: "Se esperaba exactamente una fila",
          code: "PGRST116",
        },
      };
    }
    return { data: resultado.data?.[0] ?? null, error: null };
  }

  async maybeSingle(): Promise<{ data: T | null; error: DbError | null }> {
    const resultado = await this.ejecutar();
    return { data: resultado.data?.[0] ?? null, error: resultado.error };
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.ejecutar().then(onfulfilled, onrejected);
  }

  private async ejecutar(): Promise<QueryResult<T>> {
    try {
      if (this.modo === "insert") {
        return await this.ejecutarInsercion();
      }
      if (this.modo === "update") {
        return await this.ejecutarActualizacion();
      }
      if (this.modo === "delete") {
        return await this.ejecutarBorrado();
      }
      return await this.ejecutarSeleccion();
    } catch (error) {
      return { data: [], error: errorPglite(error) };
    }
  }

  private async ejecutarSeleccion(): Promise<QueryResult<T>> {
    let sql = `select * from public.${identificadorSeguro(this.tabla)}`;
    const { clause, parametros } = this.clauseWhere();
    sql += clause;
    if (this.orden) {
      sql += ` order by ${identificadorSeguro(this.orden.columna)} ${this.orden.ascendente ? "asc" : "desc"}`;
    }
    if (this.limite !== undefined) {
      sql += ` limit ${this.limite}`;
    }
    const resultado = await this.db.query<T>(sql, parametros);
    return { data: resultado.rows, error: null };
  }

  private async ejecutarInsercion(): Promise<QueryResult<T>> {
    const filas = Array.isArray(this.valores)
      ? this.valores
      : [this.valores as Partial<T>];
    if (filas.length === 0) {
      return { data: [], error: null };
    }
    const columnas = Object.keys(filas[0] ?? {});
    if (columnas.length === 0) {
      return {
        data: [],
        error: {
          message: "No hay columnas para insertar",
          code: "EMPTY_INSERT",
        },
      };
    }
    const valores: unknown[] = [];
    const tuplas = filas.map((fila) => {
      const filaValores = columnas.map((columna) => {
        const valor = fila[columna as keyof T];
        valores.push(valor);
        return `$${valores.length}`;
      });
      return `(${filaValores.join(", ")})`;
    });
    const sql = `insert into public.${identificadorSeguro(this.tabla)} (${columnas
      .map(identificadorSeguro)
      .join(", ")}) values ${tuplas.join(", ")} returning *`;
    const resultado = await this.db.query<T>(sql, valores);
    return { data: resultado.rows, error: null };
  }

  private async ejecutarActualizacion(): Promise<QueryResult<T>> {
    const cambios = this.valores as Partial<T>;
    const entradas = Object.entries(cambios);
    if (entradas.length === 0) {
      return { data: [], error: null };
    }
    const parametros: unknown[] = [];
    const asignaciones = entradas.map(([columna, valor]) => {
      parametros.push(valor);
      return `${identificadorSeguro(columna)} = $${parametros.length}`;
    });
    const { clause, parametros: filtros } = this.clauseWhere(parametros.length);
    parametros.push(...filtros);
    const sql = `update public.${identificadorSeguro(this.tabla)} set ${asignaciones.join(", ")}${clause} returning *`;
    const resultado = await this.db.query<T>(sql, parametros);
    return { data: resultado.rows, error: null };
  }

  private async ejecutarBorrado(): Promise<QueryResult<T>> {
    const { clause, parametros } = this.clauseWhere();
    const sql = `delete from public.${identificadorSeguro(this.tabla)}${clause} returning *`;
    const resultado = await this.db.query<T>(sql, parametros);
    return { data: resultado.rows, error: null };
  }

  private clauseWhere(desplazamiento = 0): {
    clause: string;
    parametros: unknown[];
  } {
    if (this.condiciones.length === 0) {
      return { clause: "", parametros: [] };
    }
    const parametros = this.condiciones.map((condicion) => condicion.valor);
    const partes = this.condiciones.map(
      (condicion, indice) =>
        `${identificadorSeguro(condicion.columna)} = $${desplazamiento + indice + 1}`,
    );
    return { clause: ` where ${partes.join(" and ")}`, parametros };
  }
}

export function crearClientePglite(db: PGlite): SupabaseClientLike {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
    },
    from<T>(tabla: string): TableClient<T> {
      return new PgliteTableClient<T>(db, tabla);
    },
    async rpc<T>(
      fn: string,
      args: Record<string, unknown> = {},
    ): Promise<RpcResult<T>> {
      const declaracion = FUNCIONES_PERMITIDAS[fn];
      if (!declaracion) {
        throw new Error(`Función no permitida en el doble de prueba: ${fn}`);
      }
      const parametros: unknown[] = [];
      const marcadores = declaracion.map((argumento, indice) => {
        const valor = args[argumento.nombre];
        parametros.push(valorRpc(argumento.tipo, valor));
        return `$${indice + 1}::${argumento.tipo}`;
      });
      const sql = `select * from public.${identificadorSeguro(fn)}(${marcadores.join(", ")})`;
      try {
        const resultado = await db.query<T>(sql, parametros);
        return { data: resultado.rows as unknown as T, error: null };
      } catch (error) {
        return { data: null, error: errorPglite(error) };
      }
    },
  };
}

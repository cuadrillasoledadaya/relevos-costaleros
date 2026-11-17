export type DbError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type QueryResult<T> = {
  data: T[] | null;
  error: DbError | null;
};

export type SingleResult<T> = {
  data: T | null;
  error: DbError | null;
};

export interface TableClient<T> extends PromiseLike<QueryResult<T>> {
  select(columns?: string): TableClient<T>;
  insert(values: Partial<T> | Partial<T>[]): TableClient<T>;
  update(values: Partial<T>): TableClient<T>;
  delete(): TableClient<T>;
  eq(column: string, value: unknown): TableClient<T>;
  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ): TableClient<T>;
  limit(count: number): TableClient<T>;
  single(): Promise<SingleResult<T>>;
  maybeSingle(): Promise<SingleResult<T>>;
}

export type SupabaseUser = {
  id: string;
  email?: string;
};

export type SupabaseSession = {
  user: SupabaseUser;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

export type SupabaseAuthClient = {
  getUser(): Promise<{
    data: { user: SupabaseUser | null };
    error: DbError | null;
  }>;
  getSession(): Promise<{
    data: { session: SupabaseSession | null };
    error: DbError | null;
  }>;
};

/** Resultado de una llamada a una función de la base de datos (`rpc`). */
export type RpcResult<T> = {
  data: T | null;
  error: DbError | null;
};

export interface SupabaseClientLike {
  auth: SupabaseAuthClient;
  from<T = unknown>(table: string): TableClient<T>;
  /**
   * Llama a una función de la base de datos (PostgREST `rpc`). La usa el
   * repositorio de tramos para el reordenamiento transaccional.
   */
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>,
  ): PromiseLike<RpcResult<T>>;
}

export type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

/**
 * Validadores de escritura con una API estable `parse`/`safeParse`.
 *
 * El entorno actual no tiene `zod` instalado. Esta implementación local cubre el
 * subconjunto usado por W1; la dependencia `zod` del stack puede sustituirla sin
 * cambiar las formas de entrada exportadas.
 */

export type SchemaIssue = {
  path: Array<string | number>;
  message: string;
};

export type SchemaError = {
  issues: SchemaIssue[];
};

export type SafeParseResult<T> =
  { success: true; data: T } | { success: false; error: SchemaError };

export type Schema<T> = {
  parse(value: unknown): T;
  safeParse(value: unknown): SafeParseResult<T>;
};

export class ValidationError extends Error {
  readonly issues: SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export function texto(
  options: { min?: number; max?: number; uuid?: boolean } = {},
): Schema<string> {
  return crearSchema((value, path) => {
    if (typeof value !== "string") {
      return { success: false, error: error(path, "Debe ser texto") };
    }
    if (options.min !== undefined && value.length < options.min) {
      return {
        success: false,
        error: error(path, `Debe tener al menos ${options.min} caracteres`),
      };
    }
    if (options.max !== undefined && value.length > options.max) {
      return {
        success: false,
        error: error(path, `Debe tener como máximo ${options.max} caracteres`),
      };
    }
    if (options.uuid && !UUID_REGEX.test(value)) {
      return { success: false, error: error(path, "Debe ser un UUID") };
    }
    return { success: true, data: value };
  });
}

export function numero(
  options: { integer?: boolean; min?: number; max?: number } = {},
): Schema<number> {
  return crearSchema((value, path) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { success: false, error: error(path, "Debe ser un número") };
    }
    if (options.integer && !Number.isInteger(value)) {
      return {
        success: false,
        error: error(path, "Debe ser un número entero"),
      };
    }
    if (options.min !== undefined && value < options.min) {
      return {
        success: false,
        error: error(path, `Debe ser mayor o igual que ${options.min}`),
      };
    }
    if (options.max !== undefined && value > options.max) {
      return {
        success: false,
        error: error(path, `Debe ser menor o igual que ${options.max}`),
      };
    }
    return { success: true, data: value };
  });
}

export function booleano(): Schema<boolean> {
  return crearSchema((value, path) => {
    if (typeof value !== "boolean") {
      return { success: false, error: error(path, "Debe ser booleano") };
    }
    return { success: true, data: value };
  });
}

export function enumeracion<const T extends readonly string[]>(
  values: T,
): Schema<T[number]> {
  return crearSchema((value, path) => {
    if (typeof value !== "string" || !values.includes(value)) {
      return {
        success: false,
        error: error(path, `Debe ser uno de: ${values.join(", ")}`),
      };
    }
    return { success: true, data: value as T[number] };
  });
}

export function opcional<T>(schema: Schema<T>): Schema<T | undefined> {
  return crearSchema<T | undefined>(
    (value, path): SafeParseResult<T | undefined> => {
      if (value === undefined) {
        return { success: true, data: undefined };
      }
      return schemaResult(schema.safeParse(value), path);
    },
  );
}

export function nullable<T>(schema: Schema<T>): Schema<T | null> {
  return crearSchema<T | null>((value, path): SafeParseResult<T | null> => {
    if (value === null) {
      return { success: true, data: null };
    }
    return schemaResult(schema.safeParse(value), path);
  });
}

export function conValorPorDefecto<T>(schema: Schema<T>, valor: T): Schema<T> {
  return crearSchema((value, path) => {
    if (value === undefined) {
      return { success: true, data: valor };
    }
    return schemaResult(schema.safeParse(value), path);
  });
}

export function objeto<S extends Record<string, Schema<unknown>>>(
  shape: S,
): Schema<{ [K in keyof S]: SchemaResult<S[K]> }> {
  return crearSchema((value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { success: false, error: error(path, "Debe ser un objeto") };
    }

    const entrada = value as Record<string, unknown>;
    const salida: Record<string, unknown> = {};
    const issues: SchemaIssue[] = [];

    for (const key of Object.keys(shape)) {
      const resultado = shape[key]?.safeParse(entrada[key]);
      if (!resultado) {
        issues.push(issue([...path, key], "Schema no encontrado"));
        continue;
      }
      if (!resultado.success) {
        issues.push(
          ...resultado.error.issues.map((item) => ({
            ...item,
            path: [...path, ...item.path],
          })),
        );
        continue;
      }
      salida[key] = resultado.data;
    }

    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }
    return {
      success: true,
      data: salida as { [K in keyof S]: SchemaResult<S[K]> },
    };
  });
}

export function array<T>(schema: Schema<T>): Schema<T[]> {
  return crearSchema((value, path) => {
    if (!Array.isArray(value)) {
      return { success: false, error: error(path, "Debe ser una lista") };
    }
    const salida: T[] = [];
    const issues: SchemaIssue[] = [];

    value.forEach((elemento, indice) => {
      const resultado = schema.safeParse(elemento);
      if (!resultado.success) {
        issues.push(
          ...resultado.error.issues.map((item) => ({
            ...item,
            path: [...path, indice, ...item.path],
          })),
        );
      } else {
        salida.push(resultado.data);
      }
    });

    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }
    return { success: true, data: salida };
  });
}

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function json(): Schema<JsonValue> {
  return crearSchema((value, path) => {
    if (esJsonValido(value)) {
      return { success: true, data: value };
    }
    return { success: false, error: error(path, "Debe ser JSON válido") };
  });
}

export const cuadrillaSchema = objeto({
  name: texto({ min: 1 }),
  season: numero({ integer: true }),
  owner_id: texto({ uuid: true }),
  notes: opcional(nullable(texto())),
});

export const costaleroSchema = objeto({
  cuadrilla_id: texto({ uuid: true }),
  // Ancla de pertenencia (§10): referencia a la cuenta del costalero. Es
  // nullable porque el capataz puede dar de alta a un costalero antes de que
  // esa persona tenga cuenta.
  profile_id: opcional(nullable(texto({ uuid: true }))),
  full_name: texto({ min: 1 }),
  nickname: opcional(nullable(texto())),
  phone: opcional(nullable(texto())),
  notes: opcional(nullable(texto())),
  active: conValorPorDefecto(booleano(), true),
});

export const pasoSchema = objeto({
  cuadrilla_id: texto({ uuid: true }),
  name: texto({ min: 1 }),
  season: numero({ integer: true }),
  num_trabajaderas: numero({ integer: true, min: 1, max: 12 }),
});

export const trabajaderaSchema = objeto({
  paso_id: texto({ uuid: true }),
  position: numero({ integer: true, min: 1 }),
  carga: conValorPorDefecto(numero({ integer: true, min: 1, max: 5 }), 5),
});

export const asignacionSchema = objeto({
  trabajadera_id: texto({ uuid: true }),
  costalero_id: texto({ uuid: true }),
  is_boquilla: conValorPorDefecto(booleano(), false),
});

export const tramoSchema = objeto({
  paso_id: texto({ uuid: true }),
  name: texto({ min: 1 }),
  ordinal: numero({ integer: true, min: 1 }),
  kind: conValorPorDefecto(
    enumeracion(["salida", "normal", "entrada"]),
    "normal",
  ),
});

export const planSchema = objeto({
  paso_id: texto({ uuid: true }),
  version: numero({ integer: true, min: 1 }),
  status: conValorPorDefecto(
    enumeracion(["borrador", "publicado"]),
    "borrador",
  ),
  seed: numero({
    integer: true,
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
  }),
  solver_version: texto({ min: 1 }),
  stats: opcional(nullable(json())),
  created_by: opcional(nullable(texto({ uuid: true }))),
});

export const relevoSchema = objeto({
  plan_id: texto({ uuid: true }),
  tramo_id: texto({ uuid: true }),
  costalero_id: texto({ uuid: true }),
  estado: enumeracion(["en_paso", "descanso"]),
});

export const cuadrillaActualizacionSchema = objeto({
  name: opcional(texto({ min: 1 })),
  season: opcional(numero({ integer: true })),
  notes: opcional(nullable(texto())),
});

export const costaleroActualizacionSchema = objeto({
  cuadrilla_id: opcional(texto({ uuid: true })),
  profile_id: opcional(nullable(texto({ uuid: true }))),
  full_name: opcional(texto({ min: 1 })),
  nickname: opcional(nullable(texto())),
  phone: opcional(nullable(texto())),
  notes: opcional(nullable(texto())),
  active: opcional(booleano()),
});

export const pasoActualizacionSchema = objeto({
  cuadrilla_id: opcional(texto({ uuid: true })),
  name: opcional(texto({ min: 1 })),
  season: opcional(numero({ integer: true })),
  num_trabajaderas: opcional(numero({ integer: true, min: 1, max: 12 })),
});

export const trabajaderaActualizacionSchema = objeto({
  paso_id: opcional(texto({ uuid: true })),
  position: opcional(numero({ integer: true, min: 1 })),
  carga: opcional(numero({ integer: true, min: 1, max: 5 })),
});

export const asignacionActualizacionSchema = objeto({
  is_boquilla: opcional(booleano()),
});

export const tramoActualizacionSchema = objeto({
  paso_id: opcional(texto({ uuid: true })),
  name: opcional(texto({ min: 1 })),
  ordinal: opcional(numero({ integer: true, min: 1 })),
  kind: opcional(enumeracion(["salida", "normal", "entrada"])),
});

export const planActualizacionSchema = objeto({
  paso_id: opcional(texto({ uuid: true })),
  version: opcional(numero({ integer: true, min: 1 })),
  status: opcional(enumeracion(["borrador", "publicado"])),
  seed: opcional(
    numero({
      integer: true,
      min: Number.MIN_SAFE_INTEGER,
      max: Number.MAX_SAFE_INTEGER,
    }),
  ),
  solver_version: opcional(texto({ min: 1 })),
  stats: opcional(nullable(json())),
  created_by: opcional(nullable(texto({ uuid: true }))),
});

export const relevoActualizacionSchema = objeto({
  estado: opcional(enumeracion(["en_paso", "descanso"])),
});

export type CuadrillaInput = {
  name: string;
  season: number;
  owner_id: string;
  notes?: string | null;
};
export type CostaleroInput = {
  cuadrilla_id: string;
  full_name: string;
  nickname?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean;
};
export type PasoInput = {
  cuadrilla_id: string;
  name: string;
  season: number;
  num_trabajaderas: number;
};
export type TrabajaderaInput = {
  paso_id: string;
  position: number;
  carga?: number;
};
export type AsignacionInput = {
  trabajadera_id: string;
  costalero_id: string;
  is_boquilla?: boolean;
};
export type TramoInput = {
  paso_id: string;
  name: string;
  ordinal: number;
  kind?: "salida" | "normal" | "entrada";
};
export type PlanInput = {
  paso_id: string;
  version: number;
  status?: "borrador" | "publicado";
  seed: number;
  solver_version: string;
  stats?: JsonValue | null;
  created_by?: string | null;
};
export type RelevoInput = {
  plan_id: string;
  tramo_id: string;
  costalero_id: string;
  estado: "en_paso" | "descanso";
};
export type CuadrillaActualizacionInput = {
  name?: string;
  season?: number;
  notes?: string | null;
};
export type CostaleroActualizacionInput = {
  cuadrilla_id?: string;
  full_name?: string;
  nickname?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean;
};
export type PasoActualizacionInput = {
  cuadrilla_id?: string;
  name?: string;
  season?: number;
  num_trabajaderas?: number;
};
export type TrabajaderaActualizacionInput = {
  paso_id?: string;
  position?: number;
  carga?: number;
};
export type AsignacionActualizacionInput = {
  is_boquilla?: boolean;
};
export type TramoActualizacionInput = {
  paso_id?: string;
  name?: string;
  ordinal?: number;
  kind?: "salida" | "normal" | "entrada";
};
export type PlanActualizacionInput = {
  paso_id?: string;
  version?: number;
  status?: "borrador" | "publicado";
  seed?: number;
  solver_version?: string;
  stats?: JsonValue | null;
  created_by?: string | null;
};
export type RelevoActualizacionInput = {
  estado?: "en_paso" | "descanso";
};

type SchemaResult<S> = S extends Schema<infer T> ? T : never;

type Validator<T> = (
  value: unknown,
  path: Array<string | number>,
) => SafeParseResult<T>;

function crearSchema<T>(validator: Validator<T>): Schema<T> {
  return {
    parse(value: unknown): T {
      const resultado = validator(value, []);
      if (resultado.success) {
        return resultado.data;
      }
      throw new ValidationError(resultado.error.issues);
    },
    safeParse(value: unknown): SafeParseResult<T> {
      return validator(value, []);
    },
  };
}

function schemaResult<T>(
  resultado: SafeParseResult<T>,
  path: Array<string | number>,
): SafeParseResult<T> {
  if (resultado.success) {
    return resultado;
  }
  return {
    success: false,
    error: {
      issues: resultado.error.issues.map((item) => ({
        ...item,
        path: [...path, ...item.path],
      })),
    },
  };
}

function issue(path: Array<string | number>, message: string): SchemaIssue {
  return { path, message };
}

function error(path: Array<string | number>, message: string): SchemaError {
  return { issues: [issue(path, message)] };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function esJsonValido(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(esJsonValido);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(esJsonValido);
  }
  return false;
}

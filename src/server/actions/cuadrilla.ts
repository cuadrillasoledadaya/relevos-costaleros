import { revalidatePath } from "next/cache";

import {
  costaleroActualizacionSchema,
  costaleroSchema,
  cuadrillaActualizacionSchema,
  cuadrillaSchema,
  type CostaleroActualizacionInput,
  type CostaleroInput,
  type CuadrillaInput,
  type SchemaError,
} from "../../lib/schemas";
import { crearRepositorioCostaleros } from "../repos/costaleros";
import { crearRepositorioCuadrillas } from "../repos/cuadrillas";
import { createAdminSupabaseClient } from "../supabase/admin";
import { createServerSupabaseClient } from "../supabase/server";
import type { SupabaseClientLike } from "../supabase/types";

export type EstadoAccion = {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
  redireccion?: string;
};

export type EntradaCuadrilla = {
  name: string;
  season: number;
  notes: string | null;
};

export type DependenciasCrearCuadrilla = {
  usuarioActualId: string;
  crear: (
    entrada: CuadrillaInput,
  ) => Promise<{ id: string; error?: string | null }>;
};

export type EntradaCostalero = {
  cuadrillaId: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  notes: string | null;
  email: string | null;
};

export type DependenciasCrearCostalero = {
  usuarioActualId: string;
  esCapatazDeCuadrilla: (cuadrillaId: string) => Promise<boolean>;
  resolverPerfilPorEmail: (email: string) => Promise<string | null>;
  buscarCostaleroPorPerfil: (
    profileId: string,
  ) => Promise<{ id: string; cuadrilla_id: string } | null>;
  crear: (entrada: CostaleroInput) => Promise<{
    id: string;
    error?: string | null;
    codigo?: string | null;
  }>;
};

export type DependenciasActualizarCostalero = {
  usuarioActualId: string;
  esCapatazDeCuadrilla: (cuadrillaId: string) => Promise<boolean>;
  costeEsDeCuadrilla: (
    costaleroId: string,
    cuadrillaId: string,
  ) => Promise<boolean>;
  resolverPerfilPorEmail: (email: string) => Promise<string | null>;
  buscarCostaleroPorPerfil: (
    profileId: string,
  ) => Promise<{ id: string; cuadrilla_id: string } | null>;
  actualizar: (
    costaleroId: string,
    cambios: CostaleroActualizacionInput,
  ) => Promise<{ id: string; error?: string | null }>;
};

/** Ejecuta el alta de una cuadrilla; la capa de persistencia se inyecta para poder verificar el rechazo. */
export async function ejecutarCrearCuadrilla(
  entrada: EntradaCuadrilla,
  dependencias: DependenciasCrearCuadrilla,
): Promise<EstadoAccion> {
  const validacion = cuadrillaSchema.safeParse({
    name: entrada.name,
    season: entrada.season,
    owner_id: dependencias.usuarioActualId,
    notes: entrada.notes,
  });

  if (!validacion.success) {
    const errores = erroresDeValidacion(validacion.error);
    if (!errores.name && entrada.name.trim().length === 0) {
      errores.name = "Escribe el nombre de la cuadrilla.";
    }
    return {
      ok: false,
      mensaje: "Revisa los datos de la cuadrilla.",
      errores,
    };
  }

  const creado = await dependencias.crear(validacion.data);
  if (creado.error) {
    return { ok: false, mensaje: creado.error };
  }

  return {
    ok: true,
    mensaje: "Cuadrilla creada correctamente.",
    redireccion: `/cuadrillas/${creado.id}`,
  };
}

/** Crea una cuadrilla owned por el usuario autenticado y revalida el listado. */
export async function crearCuadrilla(
  _estadoAnterior: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  "use server";

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  const repositorio = crearRepositorioCuadrillas(cliente);
  const resultado = await ejecutarCrearCuadrilla(
    {
      name: valorTexto(formData, "name"),
      season: valorNumero(formData, "season"),
      notes: valorTexto(formData, "notes") || null,
    },
    {
      usuarioActualId: user.id,
      crear: async (entrada) => {
        const creado = await repositorio.crear(entrada);
        return {
          id: creado.data?.id ?? "",
          error: creado.error?.message ?? null,
        };
      },
    },
  );

  if (resultado.ok) revalidatePath("/cuadrillas");
  return resultado;
}

/** Actualiza nombre, año y notas de una cuadrilla. */
export async function actualizarCuadrilla(
  cuadrillaId: string,
  _estadoAnterior: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  "use server";

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  const validacion = cuadrillaActualizacionSchema.safeParse({
    name: valorTexto(formData, "name"),
    season: valorNumero(formData, "season"),
    notes: valorTexto(formData, "notes") || null,
  });
  if (!validacion.success) {
    return {
      ok: false,
      mensaje: "Revisa los datos de la cuadrilla.",
      errores: erroresDeValidacion(validacion.error),
    };
  }

  const repositorio = crearRepositorioCuadrillas(cliente);
  const cuadrilla = await repositorio.obtenerPorId(cuadrillaId);
  if (!cuadrilla.data || cuadrilla.data.owner_id !== user.id) {
    return {
      ok: false,
      mensaje: "No tienes permisos para editar esta cuadrilla.",
    };
  }

  const actualizada = await repositorio.actualizar(
    cuadrillaId,
    validacion.data,
  );
  if (actualizada.error) {
    return { ok: false, mensaje: actualizada.error.message };
  }

  revalidatePath("/cuadrillas");
  revalidatePath(`/cuadrillas/${cuadrillaId}`);
  return { ok: true, mensaje: "Cuadrilla actualizada correctamente." };
}

/** Elimina una cuadrilla owned por el usuario autenticado. */
export async function eliminarCuadrilla(
  cuadrillaId: string,
): Promise<EstadoAccion> {
  "use server";

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  const repositorio = crearRepositorioCuadrillas(cliente);
  const cuadrilla = await repositorio.obtenerPorId(cuadrillaId);
  if (!cuadrilla.data || cuadrilla.data.owner_id !== user.id) {
    return {
      ok: false,
      mensaje: "No tienes permisos para eliminar esta cuadrilla.",
    };
  }

  const eliminada = await repositorio.eliminar(cuadrillaId);
  if (eliminada.error) {
    return { ok: false, mensaje: eliminada.error.message };
  }

  revalidatePath("/cuadrillas");
  return { ok: true, mensaje: "Cuadrilla eliminada correctamente." };
}

/**
 * Valida y da de alta un costalero. El correo identifica una cuenta existente
 * mediante `costaleros.profile_id`; no se amplía el schema para guardar emails.
 */
export async function ejecutarCrearCostalero(
  entrada: EntradaCostalero,
  dependencias: DependenciasCrearCostalero,
): Promise<EstadoAccion> {
  if (!(await dependencias.esCapatazDeCuadrilla(entrada.cuadrillaId))) {
    return { ok: false, mensaje: "No tienes permisos para esta cuadrilla." };
  }

  const email = entrada.email?.trim() ?? "";
  let profileId: string | null = null;

  if (email) {
    profileId = await dependencias.resolverPerfilPorEmail(email);
    if (!profileId) {
      return {
        ok: false,
        mensaje:
          "Ese correo no tiene una cuenta. Pide a la persona que cree su cuenta o deja el correo en blanco.",
      };
    }

    const existente = await dependencias.buscarCostaleroPorPerfil(profileId);
    if (existente) {
      return {
        ok: false,
        mensaje:
          existente.cuadrilla_id === entrada.cuadrillaId
            ? "Este correo ya está dado de alta en esta cuadrilla."
            : "Este correo ya pertenece a otra cuadrilla.",
      };
    }
  }

  const validacion = costaleroSchema.safeParse({
    cuadrilla_id: entrada.cuadrillaId,
    profile_id: profileId,
    full_name: entrada.full_name,
    nickname: entrada.nickname,
    phone: entrada.phone,
    notes: entrada.notes,
  });
  if (!validacion.success) {
    const errores = erroresDeValidacion(validacion.error);
    if (!errores.full_name && entrada.full_name.trim().length === 0) {
      errores.full_name = "Escribe el nombre completo del costalero.";
    }
    return {
      ok: false,
      mensaje: "Revisa los datos del costalero.",
      errores,
    };
  }

  const creado = await dependencias.crear(validacion.data);
  if (creado.error) {
    return { ok: false, mensaje: mensajeDeErrorDeCostalero(creado) };
  }

  return { ok: true, mensaje: "Costalero dado de alta correctamente." };
}

/**
 * Traduce el error de la base al mensaje que ve el capataz. El índice único
 * parcial de `costaleros.profile_id` es la garantía de que una cuenta no esté
 * en dos cuadrillas: si salta, la app avisa en español en vez de filtrar el
 * error de Postgres.
 */
function mensajeDeErrorDeCostalero(error: {
  error?: string | null;
  codigo?: string | null;
}): string {
  if (error.codigo === "23505") {
    return "Este correo ya pertenece a otra cuadrilla.";
  }
  return error.error ?? "No se pudo dar de alta el costalero.";
}

/** Da de alta un costalero y revalida la cuadrilla. */
export async function crearCostalero(
  cuadrillaId: string,
  _estadoAnterior: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  "use server";

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const costaleros = crearRepositorioCostaleros(cliente);
  let adminPromise: Promise<SupabaseClientLike> | undefined;
  const obtenerAdmin = (): Promise<SupabaseClientLike> => {
    adminPromise ??= createAdminSupabaseClient();
    return adminPromise;
  };

  const resultado = await ejecutarCrearCostalero(
    {
      cuadrillaId,
      full_name: valorTexto(formData, "full_name"),
      nickname: valorTexto(formData, "nickname") || null,
      phone: valorTexto(formData, "phone") || null,
      notes: valorTexto(formData, "notes") || null,
      email: valorTexto(formData, "email") || null,
    },
    {
      usuarioActualId: user.id,
      esCapatazDeCuadrilla: async (id) => {
        const cuadrilla = await cuadrillas.obtenerPorId(id);
        return cuadrilla.data?.owner_id === user.id;
      },
      resolverPerfilPorEmail: async (email) =>
        resolverPerfilPorEmail(await obtenerAdmin(), email),
      buscarCostaleroPorPerfil: async (profileId) => {
        const resultado = await (
          await obtenerAdmin()
        )
          .from<{ id: string; cuadrilla_id: string }>("costaleros")
          .select("id, cuadrilla_id")
          .eq("profile_id", profileId)
          .limit(2);
        return resultado.data?.[0] ?? null;
      },
      crear: async (entrada) => {
        const creado = await costaleros.crear(entrada);
        return {
          id: creado.data?.id ?? "",
          error: creado.error?.message ?? null,
          codigo: creado.error?.code ?? null,
        };
      },
    },
  );

  if (resultado.ok) {
    revalidatePath(`/cuadrillas/${cuadrillaId}`);
    revalidatePath(`/cuadrillas/${cuadrillaId}/costaleros`);
  }
  return resultado;
}

/** Actualiza los datos de un costalero manteniendo la pertenencia por profile_id. */
export async function actualizarCostalero(
  cuadrillaId: string,
  _estadoAnterior: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  "use server";

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const costaleros = crearRepositorioCostaleros(cliente);
  let adminPromise: Promise<SupabaseClientLike> | undefined;
  const obtenerAdmin = (): Promise<SupabaseClientLike> => {
    adminPromise ??= createAdminSupabaseClient();
    return adminPromise;
  };
  const costaleroId = valorTexto(formData, "costalero_id");
  const email = valorTexto(formData, "email").trim();

  let profileId: string | undefined;
  if (email) {
    const admin = await obtenerAdmin();
    const resuelto = await resolverPerfilPorEmail(admin, email);
    if (!resuelto) {
      return { ok: false, mensaje: "Ese correo no tiene una cuenta." };
    }
    const existentes = await admin
      .from<{ id: string; cuadrilla_id: string }>("costaleros")
      .select("id, cuadrilla_id")
      .eq("profile_id", resuelto)
      .limit(2);
    const existente = existentes.data?.[0] ?? null;
    if (existente && existente.id !== costaleroId) {
      return {
        ok: false,
        mensaje:
          existente.cuadrilla_id === cuadrillaId
            ? "Este correo ya está dado de alta en esta cuadrilla."
            : "Este correo ya pertenece a otra cuadrilla.",
      };
    }
    profileId = resuelto;
  }

  const validacion = costaleroActualizacionSchema.safeParse({
    full_name: valorTexto(formData, "full_name"),
    nickname: valorTexto(formData, "nickname") || null,
    phone: valorTexto(formData, "phone") || null,
    notes: valorTexto(formData, "notes") || null,
    ...(profileId ? { profile_id: profileId } : {}),
  });
  if (!validacion.success) {
    const errores = erroresDeValidacion(validacion.error);
    if (!errores.full_name && valorTexto(formData, "full_name").length === 0) {
      errores.full_name = "Escribe el nombre completo del costalero.";
    }
    return {
      ok: false,
      mensaje: "Revisa los datos del costalero.",
      errores,
    };
  }

  const cuadrilla = await cuadrillas.obtenerPorId(cuadrillaId);
  const costalero = await costaleros.obtenerPorId(costaleroId);
  if (
    cuadrilla.data?.owner_id !== user.id ||
    costalero.data?.cuadrilla_id !== cuadrillaId
  ) {
    return {
      ok: false,
      mensaje: "No tienes permisos para editar este costalero.",
    };
  }

  const actualizado = await costaleros.actualizar(costaleroId, validacion.data);
  if (actualizado.error) {
    return {
      ok: false,
      mensaje: mensajeDeErrorDeCostalero({
        error: actualizado.error.message,
        codigo: actualizado.error.code,
      }),
    };
  }

  revalidatePath(`/cuadrillas/${cuadrillaId}`);
  revalidatePath(`/cuadrillas/${cuadrillaId}/costaleros`);
  return { ok: true, mensaje: "Costalero actualizado correctamente." };
}

/** Elimina un costalero de una cuadrilla propia. */
export async function eliminarCostalero(
  cuadrillaId: string,
  costaleroId: string,
): Promise<EstadoAccion> {
  "use server";

  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const costaleros = crearRepositorioCostaleros(cliente);
  const cuadrilla = await cuadrillas.obtenerPorId(cuadrillaId);
  const costalero = await costaleros.obtenerPorId(costaleroId);
  if (
    cuadrilla.data?.owner_id !== user.id ||
    costalero.data?.cuadrilla_id !== cuadrillaId
  ) {
    return {
      ok: false,
      mensaje: "No tienes permisos para eliminar este costalero.",
    };
  }

  const eliminado = await costaleros.eliminar(costaleroId);
  if (eliminado.error) {
    return { ok: false, mensaje: eliminado.error.message };
  }

  revalidatePath(`/cuadrillas/${cuadrillaId}`);
  revalidatePath(`/cuadrillas/${cuadrillaId}/costaleros`);
  return { ok: true, mensaje: "Costalero eliminado correctamente." };
}

async function resolverPerfilPorEmail(
  admin: SupabaseClientLike,
  email: string,
): Promise<string | null> {
  const auth = admin.auth as unknown as {
    admin?: {
      listUsers(options?: { page?: number; perPage?: number }): Promise<{
        data?: { users?: Array<{ id: string; email?: string }> };
      }>;
    };
  };
  if (!auth.admin) return null;

  const correo = email.trim().toLocaleLowerCase("es");
  for (let page = 1; page <= 10; page += 1) {
    const usuarios = await auth.admin.listUsers({ page, perPage: 1000 });
    const usuario = usuarios.data?.users?.find(
      (item) => item.email?.toLocaleLowerCase("es") === correo,
    );
    if (usuario) {
      const perfil = await admin
        .from<{ id: string }>("profiles")
        .select("id")
        .eq("id", usuario.id)
        .maybeSingle();
      return perfil.data?.id ?? null;
    }
    if ((usuarios.data?.users?.length ?? 0) < 1000) break;
  }

  return null;
}

function erroresDeValidacion(error: SchemaError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const primer = issue.path[0];
    // El validador local de W1 anida la clave como `[["campo"]]`; se admite
    // también la forma plana para no perder el error por formulario.
    const campo = Array.isArray(primer) ? primer[0] : primer;
    if (typeof campo === "string" && !errores[campo]) {
      errores[campo] = issue.message;
    }
  }
  return errores;
}

function valorTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function valorNumero(formData: FormData, campo: string): number {
  const valor = valorTexto(formData, campo);
  return valor === "" ? Number.NaN : Number(valor);
}

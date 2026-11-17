import { redirect } from "next/navigation";

import { createAdminSupabaseClient } from "../supabase/admin";
import { createServerSupabaseClient } from "../supabase/server";
import type { SupabaseClientLike } from "../supabase/types";
import { crearRepositorioPasos } from "../repos/pasos";
import { crearRepositorioPlanes } from "../repos/planes";
import type { EstadoAccion } from "./cuadrilla";

export type EntradaAltaCuenta = {
  full_name: string;
  email: string;
  password: string;
};

export type DependenciasAltaCuenta = {
  buscarUsuarioPorEmail: (email: string) => Promise<{ id: string } | null>;
  registrarUsuario: (
    entrada: EntradaAltaCuenta,
  ) => Promise<{ userId: string | null; error?: string | null }>;
  crearPerfil: (
    userId: string,
    fullName: string,
    role: "costalero",
  ) => Promise<{ error?: string | null }>;
};

export type ContextoMiRelevo = {
  costalero: {
    id: string;
    full_name: string;
    nickname: string | null;
  };
  cuadrillaId: string;
  planesPublicados: Array<{
    id: string;
    pasoId: string;
    pasoNombre: string;
    version: number;
  }>;
};

export type RelevoMiRelevo = {
  planId: string;
  tramoId: string;
  tramoNombre: string;
  ordinal: number;
  kind: "salida" | "normal" | "entrada";
  costaleroId: string;
  costaleroNombre: string;
  estado: "en_paso" | "descanso";
};

export type FuenteMiRelevo = {
  obtenerContexto: (cuadrillaId: string) => Promise<ContextoMiRelevo | null>;
  obtenerRelevos: (
    planId: string,
    costaleroId: string,
    costaleroNombre: string,
  ) => Promise<RelevoMiRelevo[]>;
};

export type ResultadoMiRelevo =
  | {
      estado: "ok";
      costalero: ContextoMiRelevo["costalero"];
      cuadrillaId: string;
      planes: Array<{
        id: string;
        pasoId: string;
        pasoNombre: string;
        version: number;
        tramos: Array<{
          id: string;
          nombre: string;
          ordinal: number;
          kind: "salida" | "normal" | "entrada";
          estado: "en_paso" | "descanso";
        }>;
      }>;
    }
  | { estado: "sin-acceso"; mensaje: string }
  | { estado: "sin-plan"; mensaje: string }
  | { estado: "error"; mensaje: string };

/**
 * Crea una cuenta con rol `costalero` por defecto. La comprobación previa
 * evita que Supabase oculte como si fuera nueva una cuenta ya existente.
 */
export async function ejecutarCrearCuentaCostalero(
  entrada: EntradaAltaCuenta,
  dependencias: DependenciasAltaCuenta,
): Promise<EstadoAccion> {
  const fullName = entrada.full_name.trim();
  const email = entrada.email.trim().toLocaleLowerCase("es");
  const password = entrada.password;

  if (fullName.length === 0) {
    return { ok: false, mensaje: "Escribe el nombre completo." };
  }
  if (!CORREO_VALIDO.test(email)) {
    return { ok: false, mensaje: "Escribe un correo electrónico válido." };
  }
  if (password.length < 8) {
    return {
      ok: false,
      mensaje: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  const existente = await dependencias.buscarUsuarioPorEmail(email);
  if (existente) {
    return { ok: false, mensaje: "Ese correo ya está registrado." };
  }

  const registro = await dependencias.registrarUsuario({
    full_name: fullName,
    email,
    password,
  });
  if (registro.error) {
    return { ok: false, mensaje: mensajeErrorAuth(registro.error) };
  }
  if (!registro.userId) {
    return {
      ok: false,
      mensaje:
        "No hemos podido crear la cuenta. Inténtalo de nuevo o usa el enlace mágico.",
    };
  }

  const perfil = await dependencias.crearPerfil(
    registro.userId,
    fullName,
    "costalero",
  );
  if (perfil.error) {
    return {
      ok: false,
      mensaje:
        "La cuenta se ha creado, pero no hemos podido preparar su perfil. Inténtalo de nuevo.",
    };
  }

  return {
    ok: true,
    mensaje:
      "Cuenta creada. Si se solicita confirmación, revisa tu correo antes de entrar.",
  };
}

/** Alta de cuenta expuesta como server action para el formulario P1. */
export async function crearCuentaCostalero(
  _estadoAnterior: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  "use server";

  try {
    const admin = await createAdminSupabaseClient();
    const cliente = await createServerSupabaseClient();
    const entrada: EntradaAltaCuenta = {
      full_name: textoFormData(formData, "full_name"),
      email: textoFormData(formData, "email"),
      password: textoFormData(formData, "password"),
    };

    return await ejecutarCrearCuentaCostalero(entrada, {
      buscarUsuarioPorEmail: async (email) =>
        buscarUsuarioAdminPorEmail(admin, email),
      registrarUsuario: async (datos) => {
        const auth = cliente.auth as unknown as {
          signUp(entrada: {
            email: string;
            password: string;
            options?: {
              data?: Record<string, unknown>;
              emailRedirectTo?: string;
            };
          }): Promise<{
            data: { user: { id: string } | null };
            error: { message?: string } | null;
          }>;
        };
        const respuesta = await auth.signUp({
          email: datos.email,
          password: datos.password,
          options: {
            data: { full_name: datos.full_name, role: "costalero" },
          },
        });
        return {
          userId: respuesta.data.user?.id ?? null,
          error: respuesta.error?.message ?? null,
        };
      },
      crearPerfil: async (userId, fullName, role) => {
        const existente = await admin
          .from<{ id: string }>("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (existente.data) return {};

        const creado = await admin
          .from<{ id: string; full_name: string; role: "costalero" }>(
            "profiles",
          )
          .insert({ id: userId, full_name: fullName, role })
          .select("id")
          .single();
        return { error: creado.error?.message ?? null };
      },
    });
  } catch {
    return {
      ok: false,
      mensaje:
        "No hemos podido conectar con Supabase. Revisa la configuración e inténtalo de nuevo.",
    };
  }
}

/** Cierra la sesión de Supabase. */
export async function cerrarSesion(): Promise<void> {
  "use server";

  const cliente = await createServerSupabaseClient();
  const auth = cliente.auth as unknown as {
    signOut(): Promise<{ error: { message?: string } | null }>;
  };
  await ejecutarCerrarSesion({
    signOut: () => auth.signOut(),
    redirigir: (destino) => redirect(destino),
  });
}

/** Lógica de logout separada para poder verificar que se limpia la sesión. */
export async function ejecutarCerrarSesion(deps: {
  signOut: () => Promise<{ error: unknown }>;
  redirigir: (destino: string) => void;
}): Promise<EstadoAccion> {
  const resultado = await deps.signOut();
  if (resultado.error) {
    return { ok: false, mensaje: "No hemos podido cerrar la sesión." };
  }
  deps.redirigir("/login");
  return { ok: true, mensaje: "Sesión cerrada." };
}

/**
 * Carga la línea de tiempo personal. La fuente recibe el id de la fila del
 * costalero y la implementación de producción añade ese mismo filtro a la
 * consulta; además esta función vuelve a filtrar por el id antes de devolver.
 */
export async function cargarMiRelevo(
  cuadrillaId: string,
  fuente: FuenteMiRelevo = crearFuenteSupabase(),
): Promise<ResultadoMiRelevo> {
  const contexto = await fuente.obtenerContexto(cuadrillaId);
  if (!contexto || contexto.cuadrillaId !== cuadrillaId) {
    return {
      estado: "sin-acceso",
      mensaje: "Esta cuadrilla no pertenece a tu cuenta de costalero.",
    };
  }

  if (contexto.planesPublicados.length === 0) {
    return {
      estado: "sin-plan",
      mensaje: "Todavía no hay un plan de relevos publicado para tu cuadrilla.",
    };
  }

  const planes: Extract<ResultadoMiRelevo, { estado: "ok" }>["planes"] = [];
  for (const plan of contexto.planesPublicados) {
    const relevos = await fuente.obtenerRelevos(
      plan.id,
      contexto.costalero.id,
      contexto.costalero.full_name,
    );
    const propios = relevos
      .filter((relevo) => relevo.costaleroId === contexto.costalero.id)
      .sort((a, b) => a.ordinal - b.ordinal);
    planes.push({
      ...plan,
      tramos: propios.map((relevo) => ({
        id: relevo.tramoId,
        nombre: relevo.tramoNombre,
        ordinal: relevo.ordinal,
        kind: relevo.kind,
        estado: relevo.estado,
      })),
    });
  }

  return {
    estado: "ok",
    costalero: contexto.costalero,
    cuadrillaId,
    planes,
  };
}

function crearFuenteSupabase(): FuenteMiRelevo {
  return {
    async obtenerContexto(cuadrillaId) {
      const cliente = await createServerSupabaseClient();
      const {
        data: { user },
      } = await cliente.auth.getUser();
      if (!user) return null;

      const propio = await cliente
        .from<{
          id: string;
          cuadrilla_id: string;
          full_name: string;
          nickname: string | null;
        }>("costaleros")
        .select("id, cuadrilla_id, full_name, nickname")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!propio.data) return null;

      const pasos = crearRepositorioPasos(cliente);
      const planesRepo = crearRepositorioPlanes(cliente);
      const pasosPropios = await pasos.listarPorCuadrilla(cuadrillaId);
      if (pasosPropios.error) return null;

      const planesPublicados: ContextoMiRelevo["planesPublicados"] = [];
      for (const paso of pasosPropios.data) {
        const planes = await planesRepo.listar({
          pasoId: paso.id,
          status: "publicado",
        });
        if (planes.error) continue;
        const publicado = planes.data[0];
        if (!publicado) continue;
        planesPublicados.push({
          id: publicado.id,
          pasoId: paso.id,
          pasoNombre: paso.name,
          version: publicado.version,
        });
      }

      return {
        costalero: {
          id: propio.data.id,
          full_name: propio.data.full_name,
          nickname: propio.data.nickname,
        },
        cuadrillaId: propio.data.cuadrilla_id,
        planesPublicados,
      };
    },

    async obtenerRelevos(planId, costaleroId, costaleroNombre) {
      const admin = await createAdminSupabaseClient();
      const plan = await admin
        .from<{ id: string; paso_id: string; status: string }>("planes")
        .select("id, paso_id, status")
        .eq("id", planId)
        .eq("status", "publicado")
        .maybeSingle();
      if (!plan.data) return [];

      const tramos = await admin
        .from<{
          id: string;
          name: string;
          ordinal: number;
          kind: "salida" | "normal" | "entrada";
        }>("tramos")
        .select("id, name, ordinal, kind")
        .eq("paso_id", plan.data.paso_id)
        .order("ordinal", { ascending: true });
      if (tramos.error) return [];

      const relevos = await admin
        .from<{
          plan_id: string;
          tramo_id: string;
          costalero_id: string;
          estado: "en_paso" | "descanso";
        }>("relevos")
        .select("plan_id, tramo_id, costalero_id, estado")
        .eq("plan_id", planId)
        .eq("costalero_id", costaleroId);
      if (relevos.error) return [];

      const porTramo = new Map(
        (tramos.data ?? []).map((tramo) => [tramo.id, tramo] as const),
      );
      return (relevos.data ?? []).flatMap((relevo) => {
        const tramo = porTramo.get(relevo.tramo_id);
        if (!tramo) return [];
        return [
          {
            planId: relevo.plan_id,
            tramoId: tramo.id,
            tramoNombre: tramo.name,
            ordinal: tramo.ordinal,
            kind: tramo.kind,
            costaleroId: relevo.costalero_id,
            costaleroNombre,
            estado: relevo.estado,
          },
        ];
      });
    },
  };
}

async function buscarUsuarioAdminPorEmail(
  admin: SupabaseClientLike,
  email: string,
): Promise<{ id: string } | null> {
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
    const encontrado = usuarios.data?.users?.find(
      (usuario) => usuario.email?.toLocaleLowerCase("es") === correo,
    );
    if (encontrado) return { id: encontrado.id };
    if ((usuarios.data?.users?.length ?? 0) < 1000) break;
  }
  return null;
}

function mensajeErrorAuth(error: string): string {
  if (/already registered|already been registered/i.test(error)) {
    return "Ese correo ya está registrado.";
  }
  if (/password/i.test(error)) {
    return "La contraseña no cumple los requisitos de Supabase.";
  }
  if (/rate limit|too many/i.test(error)) {
    return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  }
  return "No hemos podido crear la cuenta. Inténtalo de nuevo.";
}

function textoFormData(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

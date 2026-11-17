import { createServerSupabaseClient } from "@/server/supabase/server";
import type { SupabaseUser } from "@/server/supabase/types";

export type PerfilActual = {
  id: string;
  full_name: string;
  role: "capataz" | "costalero";
};

export type FilaCostaleroActual = {
  id: string;
  cuadrilla_id: string;
  full_name: string;
  nickname: string | null;
};

export type CostaleroActual = FilaCostaleroActual | null;

export type SesionActual = {
  user: SupabaseUser;
  perfil: PerfilActual | null;
  costalero: CostaleroActual;
};

/** Carga la identidad y el perfil visibles para la sesión actual mediante RLS. */
export async function cargarSesion(): Promise<SesionActual | null> {
  const cliente = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cliente.auth.getUser();
  if (!user) return null;

  const perfil = await cliente
    .from<PerfilActual>("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const costalero = await cliente
    .from<FilaCostaleroActual>("costaleros")
    .select("id, cuadrilla_id, full_name, nickname")
    .eq("profile_id", user.id)
    .maybeSingle();

  return {
    user,
    perfil: perfil.data ?? null,
    costalero: costalero.data ?? null,
  };
}

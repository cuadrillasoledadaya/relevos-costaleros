import { redirect } from "next/navigation";

import { CerrarSesion } from "@/components/features/auth/CerrarSesion";
import { cargarSesion } from "@/components/features/cuadrillas/sesion";
import { AppShell, type NavItem } from "@/components/shell";
import { Alert, Avatar } from "@/components/ui";
import { cerrarSesion } from "@/server/actions/costalero";

/**
 * Estas rutas dependen de la sesión: no se prerenderizan. Además, el build no
 * debe depender de las variables de Supabase (el CI compila sin ellas).
 */
export const dynamic = "force-dynamic";

export default async function LayoutAutenticado({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesion = await cargarSesion();
  if (!sesion) redirect("/login");

  const navegacion: NavItem[] = [];
  if (sesion.perfil?.role === "capataz") {
    navegacion.push({
      key: "cuadrillas",
      label: "Cuadrillas",
      href: "/cuadrillas",
      icon: "cuadrilla",
    });
  } else if (sesion.perfil?.role === "costalero" && sesion.costalero) {
    navegacion.push({
      key: "mi-relevo",
      label: "Mi relevo",
      href: `/cuadrillas/${sesion.costalero.cuadrilla_id}/mi-relevo`,
      icon: "costalero",
    });
  }

  return (
    <AppShell
      title="Relevos de costaleros"
      nav={navegacion}
      headerActions={
        <div className="flex items-center gap-2">
          {sesion.perfil ? (
            <span className="hidden sm:block">
              <Avatar name={sesion.perfil.full_name} size="sm" />
            </span>
          ) : null}
          <CerrarSesion accion={cerrarSesion} />
        </div>
      }
    >
      {!sesion.perfil ? (
        <div className="mb-4">
          <Alert tone="danger" title="Perfil no configurado">
            Tu cuenta todavía no tiene un perfil de capataz o costalero.
          </Alert>
        </div>
      ) : null}
      {children}
    </AppShell>
  );
}

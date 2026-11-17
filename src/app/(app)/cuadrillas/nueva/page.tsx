import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CargandoContenido } from "@/components/features/cuadrillas/EstadosCarga";
import { FormularioCuadrilla } from "@/components/features/cuadrillas/FormularioCuadrilla";
import { cargarSesion } from "@/components/features/cuadrillas/sesion";
import { Alert, Card, CardBody } from "@/components/ui";
import { crearCuadrilla } from "@/server/actions/cuadrilla";

export const metadata: Metadata = {
  title: "Nueva cuadrilla",
};

export default function PaginaNuevaCuadrilla() {
  return (
    <Suspense
      fallback={<CargandoContenido etiqueta="Cargando formulario…" filas={1} />}
    >
      <ContenidoNuevaCuadrilla />
    </Suspense>
  );
}

async function ContenidoNuevaCuadrilla() {
  const sesion = await cargarSesion();
  if (!sesion) {
    return (
      <Alert tone="danger" title="Sesión no válida">
        Vuelve a entrar para continuar.
      </Alert>
    );
  }
  if (sesion.perfil?.role !== "capataz") {
    return (
      <Alert tone="warning" title="Sin permisos">
        Tu cuenta de costalero no puede crear cuadrillas.
      </Alert>
    );
  }

  return (
    <section className="grid gap-5">
      <header>
        <Link
          href="/cuadrillas"
          className="text-pequeno text-primary underline"
        >
          Volver a cuadrillas
        </Link>
        <h1 className="mt-2 text-titulo font-semibold text-fg">
          Crear cuadrilla
        </h1>
        <p className="mt-1 text-cuerpo text-fg-muted">
          Empieza con el nombre y el año de la cuadrilla.
        </p>
      </header>

      <Card className="max-w-2xl">
        <CardBody>
          <FormularioCuadrilla accion={crearCuadrilla} />
        </CardBody>
      </Card>
    </section>
  );
}

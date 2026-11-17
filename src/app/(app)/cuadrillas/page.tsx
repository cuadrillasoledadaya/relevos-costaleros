import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CargandoContenido } from "@/components/features/cuadrillas/EstadosCarga";
import { ListaCuadrillas } from "@/components/features/cuadrillas/ListaCuadrillas";
import { cargarSesion } from "@/components/features/cuadrillas/sesion";
import { Alert } from "@/components/ui";
import { eliminarCuadrilla } from "@/server/actions/cuadrilla";
import { crearRepositorioCostaleros } from "@/server/repos/costaleros";
import { crearRepositorioCuadrillas } from "@/server/repos/cuadrillas";
import { createServerSupabaseClient } from "@/server/supabase/server";

export const metadata: Metadata = {
  title: "Cuadrillas",
};

export default function PaginaCuadrillas() {
  return (
    <Suspense fallback={<CargandoContenido etiqueta="Cargando cuadrillas…" />}>
      <ContenidoCuadrillas />
    </Suspense>
  );
}

async function ContenidoCuadrillas() {
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
        Tu cuenta de costalero no puede gestionar cuadrillas.
      </Alert>
    );
  }

  const cliente = await createServerSupabaseClient();
  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const costaleros = crearRepositorioCostaleros(cliente);
  const listado = await cuadrillas.listar({ ownerId: sesion.user.id });

  if (listado.error) {
    return (
      <Alert tone="danger" title="No hemos podido cargar las cuadrillas">
        <p>{listado.error.message}</p>
        <Link href="/cuadrillas" className="font-medium underline">
          Reintentar
        </Link>
      </Alert>
    );
  }

  const resumen = await Promise.all(
    listado.data.map(async (cuadrilla) => {
      const personas = await costaleros.listarPorCuadrilla(cuadrilla.id);
      return {
        id: cuadrilla.id,
        name: cuadrilla.name,
        season: cuadrilla.season,
        totalCostaleros: personas.data.length,
      };
    }),
  );

  return (
    <section className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-titulo font-semibold text-fg">Cuadrillas</h1>
          <p className="mt-1 text-cuerpo text-fg-muted">
            Gestiona las cuadrillas y sus costaleros.
          </p>
        </div>
        <Link
          href="/cuadrillas/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-fg"
        >
          Crear cuadrilla
        </Link>
      </header>

      <ListaCuadrillas
        cuadrillas={resumen}
        accionEliminar={eliminarCuadrilla}
      />
    </section>
  );
}

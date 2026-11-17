import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CargandoContenido } from "@/components/features/cuadrillas/EstadosCarga";
import { FormularioCuadrilla } from "@/components/features/cuadrillas/FormularioCuadrilla";
import { GestorCostaleros } from "@/components/features/cuadrillas/GestorCostaleros";
import { cargarSesion } from "@/components/features/cuadrillas/sesion";
import { Alert, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import {
  actualizarCuadrilla,
  actualizarCostalero,
  crearCostalero,
  eliminarCostalero,
} from "@/server/actions/cuadrilla";
import { crearRepositorioCostaleros } from "@/server/repos/costaleros";
import { crearRepositorioCuadrillas } from "@/server/repos/cuadrillas";
import { createServerSupabaseClient } from "@/server/supabase/server";

export const metadata: Metadata = {
  title: "Cuadrilla",
};

export default function PaginaCuadrilla({
  params,
}: {
  params: Promise<{ cuadrillaId: string }>;
}) {
  return (
    <Suspense fallback={<CargandoContenido etiqueta="Cargando cuadrilla…" />}>
      <ContenidoCuadrilla params={params} />
    </Suspense>
  );
}

async function ContenidoCuadrilla({
  params,
}: {
  params: Promise<{ cuadrillaId: string }>;
}) {
  const { cuadrillaId } = await params;
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
        Tu cuenta de costalero no puede gestionar esta cuadrilla.
      </Alert>
    );
  }

  const cliente = await createServerSupabaseClient();
  const cuadrillas = crearRepositorioCuadrillas(cliente);
  const costaleros = crearRepositorioCostaleros(cliente);
  const cuadrilla = await cuadrillas.obtenerPorId(cuadrillaId);
  if (cuadrilla.error) {
    return (
      <Alert tone="danger" title="No hemos podido cargar la cuadrilla">
        {cuadrilla.error.message}
      </Alert>
    );
  }
  if (!cuadrilla.data || cuadrilla.data.owner_id !== sesion.user.id) {
    return (
      <Alert tone="warning" title="Sin permisos">
        No tienes acceso a esta cuadrilla.
      </Alert>
    );
  }

  const personas = await costaleros.listarPorCuadrilla(cuadrillaId);
  if (personas.error) {
    return (
      <Alert tone="danger" title="No hemos podido cargar los costaleros">
        {personas.error.message}
      </Alert>
    );
  }

  return (
    <section className="grid gap-6">
      <header>
        <Link
          href="/cuadrillas"
          className="text-pequeno text-primary underline"
        >
          Volver a cuadrillas
        </Link>
        <h1 className="mt-2 text-titulo font-semibold text-fg">
          {cuadrilla.data.name}
        </h1>
        <p className="mt-1 text-cuerpo text-fg-muted">
          Año {cuadrilla.data.season}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Editar cuadrilla</CardTitle>
        </CardHeader>
        <CardBody>
          <FormularioCuadrilla
            accion={actualizarCuadrilla.bind(null, cuadrillaId)}
            cuadrilla={{
              name: cuadrilla.data.name,
              season: cuadrilla.data.season,
              notes: cuadrilla.data.notes,
            }}
          />
        </CardBody>
      </Card>

      <GestorCostaleros
        costaleros={personas.data}
        accionCrear={crearCostalero.bind(null, cuadrillaId)}
        accionActualizar={actualizarCostalero.bind(null, cuadrillaId)}
        accionEliminar={eliminarCostalero.bind(null, cuadrillaId)}
      />
    </section>
  );
}

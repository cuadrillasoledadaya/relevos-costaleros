import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CargandoContenido } from "@/components/features/cuadrillas/EstadosCarga";
import { VistaMiRelevo } from "@/components/features/cuadrillas/VistaMiRelevo";
import { Alert, EmptyState } from "@/components/ui";
import { cargarMiRelevo } from "@/server/actions/costalero";

export const metadata: Metadata = {
  title: "Mi relevo",
};

export default function PaginaMiRelevo({
  params,
}: {
  params: Promise<{ cuadrillaId: string }>;
}) {
  return (
    <Suspense fallback={<CargandoContenido etiqueta="Cargando mi relevo…" />}>
      <ContenidoMiRelevo params={params} />
    </Suspense>
  );
}

async function ContenidoMiRelevo({
  params,
}: {
  params: Promise<{ cuadrillaId: string }>;
}) {
  const { cuadrillaId } = await params;
  const resultado = await cargarMiRelevo(cuadrillaId);

  if (resultado.estado === "sin-acceso") {
    return (
      <Alert tone="warning" title="Sin acceso">
        {resultado.mensaje}
      </Alert>
    );
  }
  if (resultado.estado === "sin-plan") {
    return (
      <EmptyState
        title="Todavía no hay un plan publicado"
        description={resultado.mensaje}
        action={
          <Link
            href="/cuadrillas"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-fg"
          >
            Volver a cuadrillas
          </Link>
        }
      />
    );
  }
  if (resultado.estado === "error") {
    return (
      <Alert tone="danger" title="No hemos podido cargar tu relevo">
        {resultado.mensaje}
      </Alert>
    );
  }

  return (
    <section className="grid gap-5">
      <header>
        <h1 className="text-titulo font-semibold text-fg">Mi relevo</h1>
        <p className="mt-1 text-cuerpo text-fg-muted">
          Tu línea de tiempo de descansos y entradas.
        </p>
      </header>
      <VistaMiRelevo resultado={resultado} />
    </section>
  );
}

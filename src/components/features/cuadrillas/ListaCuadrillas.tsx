"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
} from "@/components/ui";
import type { EstadoAccion } from "@/server/actions/cuadrilla";

export type CuadrillaResumen = {
  id: string;
  name: string;
  season: number;
  totalCostaleros: number;
};

export type ListaCuadrillasProps = {
  cuadrillas: CuadrillaResumen[];
  accionEliminar: (cuadrillaId: string) => Promise<EstadoAccion>;
};

export function ListaCuadrillas({
  cuadrillas,
  accionEliminar,
}: ListaCuadrillasProps) {
  const router = useRouter();
  const [aEliminar, setAEliminar] = useState<CuadrillaResumen | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function confirmarEliminacion() {
    if (!aEliminar) return;
    setEliminando(true);
    await accionEliminar(aEliminar.id);
    setEliminando(false);
    setAEliminar(null);
    router.refresh();
  }

  if (cuadrillas.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay cuadrillas"
        description="Crea la cuadrilla donde guardarás a tus costaleros."
        action={
          <Link
            href="/cuadrillas/nueva"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-fg"
          >
            Crear cuadrilla
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {cuadrillas.map((cuadrilla) => (
          <Card key={cuadrilla.id}>
            <CardBody>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-cabecera font-semibold text-fg">
                      {cuadrilla.name}
                    </h2>
                    <Badge tone="primary">{cuadrilla.season}</Badge>
                  </div>
                  <p className="mt-1 text-pequeno text-fg-muted">
                    {cuadrilla.totalCostaleros === 1
                      ? "1 costalero"
                      : `${cuadrilla.totalCostaleros} costaleros`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/cuadrillas/${cuadrilla.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-fg"
                  >
                    Abrir
                  </Link>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setAEliminar(cuadrilla)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={aEliminar !== null}
        onClose={() => setAEliminar(null)}
        onConfirm={() => void confirmarEliminacion()}
        title="Eliminar cuadrilla"
        description={
          aEliminar
            ? `Se eliminarán «${aEliminar.name}» y sus costaleros. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        tone="danger"
        loading={eliminando}
        confirmLoadingText="Eliminando…"
      />
    </>
  );
}

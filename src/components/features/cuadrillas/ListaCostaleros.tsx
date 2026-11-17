"use client";

import { useState } from "react";
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

export type CostaleroResumen = {
  id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  notes: string | null;
  profile_id: string | null;
  active: boolean;
};

export type ListaCostalerosProps = {
  costaleros: CostaleroResumen[];
  onCrear: () => void;
  onEditar: (costalero: CostaleroResumen) => void;
  accionEliminar: (costaleroId: string) => Promise<EstadoAccion>;
};

export function ListaCostaleros({
  costaleros,
  onCrear,
  onEditar,
  accionEliminar,
}: ListaCostalerosProps) {
  const router = useRouter();
  const [aEliminar, setAEliminar] = useState<CostaleroResumen | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function confirmarEliminacion() {
    if (!aEliminar) return;
    setEliminando(true);
    await accionEliminar(aEliminar.id);
    setEliminando(false);
    setAEliminar(null);
    router.refresh();
  }

  if (costaleros.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay costaleros"
        description="Da de alta a las personas que forman parte de esta cuadrilla."
        action={
          <Button type="button" onClick={onCrear}>
            Añadir costalero
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {costaleros.map((costalero) => (
          <Card key={costalero.id}>
            <CardBody>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-fg">
                      {costalero.full_name}
                    </h3>
                    {costalero.nickname ? (
                      <Badge tone="primary">{costalero.nickname}</Badge>
                    ) : null}
                    {!costalero.active ? (
                      <Badge tone="neutral">No activo</Badge>
                    ) : null}
                  </div>
                  <dl className="mt-2 grid gap-1 text-pequeno text-fg-muted">
                    {costalero.phone ? (
                      <div>
                        <dt className="inline font-medium">Teléfono: </dt>
                        <dd className="inline">{costalero.phone}</dd>
                      </div>
                    ) : null}
                    {costalero.notes ? (
                      <div>
                        <dt className="inline font-medium">Notas: </dt>
                        <dd className="inline">{costalero.notes}</dd>
                      </div>
                    ) : null}
                    {!costalero.profile_id ? (
                      <div>Todavía no tiene una cuenta vinculada.</div>
                    ) : null}
                  </dl>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditar(costalero)}
                  >
                    Editar {costalero.full_name}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setAEliminar(costalero)}
                  >
                    Eliminar {costalero.full_name}
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
        title="Eliminar costalero"
        description={
          aEliminar
            ? `Se eliminará «${aEliminar.full_name}» de esta cuadrilla.`
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

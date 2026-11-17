"use client";

import { useState } from "react";

import { Badge, Tag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Table, TableCell, TableRow } from "@/components/ui/Table";

import {
  TEXTO_TIPO_TRABAJADERA,
  costalerosOrdenados,
  puestosDe,
  tipoDe,
} from "./estado";
import type { PropiedadesPaso } from "./tipos";

/**
 * Paso 3 del wizard (P3): asignación nominal. Qué costalero va a cada pool y
 * con qué puesto (§6): la primera y la última trabajadera llevan
 * pateros y las intermedias costeros.
 *
 * El app no decide quién es el corriente (P-6): el puesto se muestra en el
 * orden de §6 con los costaleros del pool ordenados por nombre, que es el
 * orden con el que se guardan.
 */
export function PasoAsignacion({
  estado,
  datos,
  acciones,
  cargando,
  actualizar,
}: PropiedadesPaso) {
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const total = datos.trabajaderas.length;
  const asignados = new Set(Object.values(estado.reparto).flat());
  const disponibles = datos.costaleros.filter(
    (costalero) => !asignados.has(costalero.id),
  );

  const anadir = (trabajaderaId: string, costaleroId: string) => {
    if (!costaleroId) return;
    actualizar({
      reparto: {
        ...estado.reparto,
        [trabajaderaId]: [
          ...(estado.reparto[trabajaderaId] ?? []),
          costaleroId,
        ],
      },
    });
    setSeleccion((actual) => ({ ...actual, [trabajaderaId]: "" }));
  };

  const quitar = (trabajaderaId: string, costaleroId: string) => {
    const pool = estado.reparto[trabajaderaId] ?? [];
    if (!pool.includes(costaleroId)) return;
    actualizar({
      reparto: {
        ...estado.reparto,
        [trabajaderaId]: pool.filter((id) => id !== costaleroId),
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {datos.trabajaderas.map((trabajadera) => {
        const carga = estado.cargas[trabajadera.id] ?? trabajadera.carga;
        const pool = costalerosOrdenados(
          estado.reparto[trabajadera.id] ?? [],
          datos.costaleros,
        );
        const enPuestos = pool.slice(0, carga);
        const suplentes = pool.slice(carga);
        const puestos = puestosDe(trabajadera.position, total);

        return (
          <Card key={trabajadera.id}>
            <CardHeader>
              <CardTitle>
                Trabajadera {trabajadera.position} ·{" "}
                {TEXTO_TIPO_TRABAJADERA[tipoDe(trabajadera.position, total)]}
              </CardTitle>
              <p className="text-pequeno text-fg-muted">
                {pool.length} costaleros en el pool · carga {carga} ·{" "}
                {Math.max(0, pool.length - carga)} suplente
                {pool.length - carga === 1 ? "" : "s"}
              </p>
            </CardHeader>
            <CardBody>
              <Table
                columns={[
                  { key: "puesto", header: "Puesto" },
                  { key: "costalero", header: "Costalero" },
                ]}
                caption="Puestos de izquierda a derecha (§6)."
              >
                {puestos.map((puesto) => {
                  const costalero = enPuestos[puesto.indice];
                  return (
                    <TableRow key={puesto.indice}>
                      <TableCell>
                        <span className="font-medium">{puesto.nombre}</span>
                      </TableCell>
                      <TableCell>
                        {costalero ? (
                          <span className="flex items-center gap-2">
                            {costalero.full_name}
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Quitar a ${costalero.full_name} del pool`}
                              onClick={() =>
                                quitar(trabajadera.id, costalero.id)
                              }
                            >
                              Quitar
                            </Button>
                          </span>
                        ) : (
                          <Badge tone="warning">sin cubrir</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>

              {suplentes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-pequeno font-medium text-fg">
                    Suplentes (descansan mientras los de los puestos van en el
                    paso)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suplentes.map((costalero) => (
                      <Tag
                        key={costalero.id}
                        onRemove={() => quitar(trabajadera.id, costalero.id)}
                        removeLabel={`Quitar a ${costalero.full_name} del pool`}
                      >
                        {costalero.full_name}
                      </Tag>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-2">
                <FormField
                  id={`anadir-${trabajadera.id}`}
                  label="Añadir costalero al pool"
                  helper="Un costalero solo puede estar en un pool."
                  className="min-w-56 flex-1"
                >
                  <Select
                    id={`anadir-${trabajadera.id}`}
                    value={seleccion[trabajadera.id] ?? ""}
                    onChange={(event) =>
                      setSeleccion((actual) => ({
                        ...actual,
                        [trabajadera.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Elige un costalero…</option>
                    {disponibles.map((costalero) => (
                      <option key={costalero.id} value={costalero.id}>
                        {costalero.full_name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <Button
                  variant="secondary"
                  onClick={() =>
                    anadir(trabajadera.id, seleccion[trabajadera.id] ?? "")
                  }
                  disabled={!seleccion[trabajadera.id]}
                >
                  Añadir al pool
                </Button>
              </div>
            </CardBody>
          </Card>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          loading={cargando}
          onClick={() => void acciones.guardarReparto()}
        >
          Guardar asignación
        </Button>
        <p className="text-pequeno text-fg-muted">
          Un costalero en dos pools se rechaza y no se guarda nada.
        </p>
      </div>
    </div>
  );
}

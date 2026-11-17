"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableCell, TableRow } from "@/components/ui/Table";

import type { PropiedadesPaso } from "./tipos";

/** Orden de las precondiciones en la lista (§7.4). */
const ORDEN_PRECONDICIONES = ["F-1", "F-2", "F-3", "F-4", "F-5", "F-6"];

/**
 * Paso 6 del wizard (P3): resumen y validación.
 *
 * El checklist es el resultado de `evaluarFactibilidad` de W2 (§7.4): cada
 * precondición con su estado, su mensaje y su sugerencia. Mientras alguna
 * falle, el botón de calcular el plan queda deshabilitado.
 */
export function PasoResumen({
  estado,
  datos,
  factibilidad,
  acciones,
}: PropiedadesPaso) {
  const precondiciones = [...factibilidad.precondiciones].sort(
    (a, b) =>
      ORDEN_PRECONDICIONES.indexOf(a.id) - ORDEN_PRECONDICIONES.indexOf(b.id),
  );
  const total = estado.tramos.length;
  const asignados = datos.trabajaderas.reduce(
    (suma, trabajadera) => suma + (estado.reparto[trabajadera.id]?.length ?? 0),
    0,
  );
  const diagnostico = factibilidad.diagnostico;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Resumen del paso</CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-3 text-pequeno">
            <div>
              <dt className="text-fg-muted">Nombre</dt>
              <dd className="font-semibold text-fg">{estado.nombre}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Año</dt>
              <dd className="font-semibold text-fg">{estado.anio}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Trabajaderas</dt>
              <dd className="font-semibold text-fg">
                {datos.trabajaderas.length}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">Costaleros en el paso</dt>
              <dd className="font-semibold text-fg">{asignados}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Tramos del recorrido</dt>
              <dd className="font-semibold text-fg">{total}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Boquillas</dt>
              <dd className="font-semibold text-fg">
                {estado.boquillas.length} de 2
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprobación de factibilidad</CardTitle>
          <p className="text-pequeno text-fg-muted">
            Las precondiciones F-1 a F-6 se comprueban antes de calcular el plan
            de relevos.
          </p>
        </CardHeader>
        <CardBody>
          <Table
            columns={[
              { key: "id", header: "Precondición" },
              { key: "estado", header: "Estado" },
              { key: "mensaje", header: "Detalle" },
            ]}
          >
            {precondiciones.map((precondicion) => (
              <TableRow key={precondicion.id}>
                <TableCell>
                  <span className="font-medium">{precondicion.id}</span>
                </TableCell>
                <TableCell>
                  {precondicion.cumple ? (
                    <Badge tone="success">cumple</Badge>
                  ) : (
                    <Badge tone="danger">no cumple</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span>{precondicion.mensaje}</span>
                  {precondicion.sugerencia ? (
                    <span className="block text-pequeno text-fg-muted">
                      {precondicion.sugerencia}
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </Table>

          {diagnostico ? (
            <Alert tone="danger" title="El plan todavía no se puede calcular">
              <p>{diagnostico.mensaje}</p>
              <p>{diagnostico.sugerencia}</p>
            </Alert>
          ) : (
            <Alert tone="success" title="El paso es factible">
              <p>
                Se cumplen las seis precondiciones: el plan de relevos se puede
                calcular.
              </p>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!factibilidad.factible}
              onClick={() => acciones.irAlPlan()}
            >
              Calcular plan de relevos
            </Button>
            {!factibilidad.factible ? (
              <p className="text-pequeno text-fg-muted">
                El botón queda deshabilitado hasta que se cumplan todas las
                precondiciones.
              </p>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

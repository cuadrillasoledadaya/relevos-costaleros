import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableCell, TableRow } from "@/components/ui/Table";
import { descansosPorPersona } from "@/components/features/configuracion/estado";
import type { ResultadoFactibilidad } from "@/domain/modelo";

import type { TrabajadoraPantalla } from "./tipos";

export type PropiedadesFactibilidadTramos = {
  /** Estado devuelto por `evaluarFactibilidad` para el recorrido actual. */
  factibilidad: ResultadoFactibilidad;
  /** Trabajaderas del paso con sus pools. */
  trabajadoras: TrabajadoraPantalla[];
  /** Número actual de tramos del recorrido (`T`). */
  totalTramos: number;
};

/**
 * Prechequeo de factibilidad del recorrido (§7.3 y §7.4).
 *
 * Los estados F-1..F-6 y el número de tramos necesario vienen exclusivamente
 * de `evaluarFactibilidad`; aquí sólo se presentan sus resultados.
 */
export function FactibilidadTramos({
  factibilidad,
  trabajadoras,
  totalTramos,
}: PropiedadesFactibilidadTramos) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Factibilidad del recorrido</CardTitle>
          <Badge tone={factibilidad.factible ? "success" : "danger"}>
            {factibilidad.factible
              ? "Recorrido factible"
              : "Recorrido no factible"}
          </Badge>
        </div>
        <p className="text-pequeno text-fg-muted">
          Se recalcula con cada cambio del recorrido, sin recargar la página.
        </p>
      </CardHeader>
      <CardBody>
        <div className="overflow-hidden rounded-md border border-border">
          <Table
            caption="Factibilidad por trabajadera"
            columns={[
              { key: "trabajadera", header: "Trabajadera" },
              { key: "pool", header: "Pool", align: "right" },
              { key: "carga", header: "Carga", align: "right" },
              { key: "r", header: "Descansan por tramo", align: "right" },
              {
                key: "descansos",
                header: "Descansos por persona",
                align: "right",
              },
              {
                key: "faltan",
                header: "Tramos que faltan",
                align: "right",
              },
            ]}
          >
            {trabajadoras.map((trabajadera) => {
              const pool = trabajadera.pool.length;
              const carga = trabajadera.carga;
              const r = pool - carga;
              const necesarios =
                factibilidad.tramosMinimosPorTrabajadera[trabajadera.id] ?? 0;
              const faltan = Number.isFinite(necesarios)
                ? Math.max(0, necesarios - totalTramos)
                : null;

              return (
                <TableRow key={trabajadera.id}>
                  <TableCell>{trabajadera.position}</TableCell>
                  <TableCell>{pool}</TableCell>
                  <TableCell>{carga}</TableCell>
                  <TableCell>{r}</TableCell>
                  <TableCell>
                    {descansosPorPersona(totalTramos, pool, carga).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {faltan === null ? "No calculable" : faltan}
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        </div>

        <section aria-labelledby="precondiciones-factibilidad">
          <h3
            id="precondiciones-factibilidad"
            className="text-pequeno font-semibold text-fg"
          >
            Precondiciones F-1 a F-6
          </h3>
          <div className="flex flex-col gap-2">
            {factibilidad.precondiciones.map((precondicion) =>
              precondicion.cumple ? (
                <div
                  key={precondicion.id}
                  className="flex flex-col gap-1 rounded-md border border-success-soft bg-success-soft p-3"
                >
                  <Badge tone="success">{precondicion.id} · cumple</Badge>
                  <p className="text-pequeno text-fg">{precondicion.mensaje}</p>
                </div>
              ) : (
                <Alert
                  key={precondicion.id}
                  tone="danger"
                  title={`${precondicion.id} · no cumple`}
                >
                  <p className="font-medium text-danger">
                    {precondicion.mensaje}
                  </p>
                  {precondicion.sugerencia ? (
                    <p>Ajuste mínimo: {precondicion.sugerencia}.</p>
                  ) : null}
                </Alert>
              ),
            )}
          </div>
        </section>
      </CardBody>
    </Card>
  );
}

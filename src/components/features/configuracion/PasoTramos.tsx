"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Table, TableCell, TableRow } from "@/components/ui/Table";

import { descansosPorPersona, tramosPropuestos } from "./estado";
import type { PropiedadesPaso } from "./tipos";

/**
 * Paso 5 del wizard (P3): cuántos tramos hacen falta.
 *
 * El número de tramos sale de `tramosNecesarios` de W2 (§7.3): el mínimo de
 * cada trabajadera para que sus costaleros descansen 2 veces. El
 * recorrido se particiona una sola vez, así que se propone el máximo
 * (supuesto S-3) y el capataz puede ajustarlo.
 */
export function PasoTramos({
  estado,
  datos,
  factibilidad,
  acciones,
  cargando,
  actualizar,
}: PropiedadesPaso) {
  const total = estado.tramos.length;
  const minimos = factibilidad.tramosMinimos;
  const minimosFinitos = Number.isFinite(minimos) ? minimos : null;

  const cambiarTotal = (valor: number) => {
    const nuevoTotal = Math.max(2, Math.floor(valor) || 2);
    actualizar({ tramos: tramosPropuestos(estado, nuevoTotal) });
  };

  const renombrar = (indice: number, nombre: string) => {
    actualizar({
      tramos: estado.tramos.map((tramo, posicion) =>
        posicion === indice ? { ...tramo, name: nombre } : tramo,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tramos que hacen falta</CardTitle>
          <p className="text-pequeno text-fg-muted">
            El detalle por trabajadera: cuántos costaleros hay en el pool,
            cuántos descansan en cada tramo y cuántos tramos necesita cada una
            para que todos descansen 2 veces.
          </p>
        </CardHeader>
        <CardBody>
          <Table
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
            {datos.trabajaderas.map((trabajadera) => {
              const pool = estado.reparto[trabajadera.id]?.length ?? 0;
              const carga = estado.cargas[trabajadera.id] ?? trabajadera.carga;
              const r = pool - carga;
              const necesarios =
                factibilidad.tramosMinimosPorTrabajadera[trabajadera.id] ?? 0;
              const faltan = Number.isFinite(necesarios)
                ? Math.max(0, necesarios - total)
                : 0;
              return (
                <TableRow key={trabajadera.id}>
                  <TableCell>{trabajadera.position}</TableCell>
                  <TableCell>{pool}</TableCell>
                  <TableCell>{carga}</TableCell>
                  <TableCell>{r > 0 ? r : 0}</TableCell>
                  <TableCell>
                    {descansosPorPersona(total, pool, carga).toFixed(2)}
                  </TableCell>
                  <TableCell>{faltan}</TableCell>
                </TableRow>
              );
            })}
          </Table>

          {minimosFinitos === null ? (
            <Alert
              tone="danger"
              title="No se puede calcular el número de tramos"
            >
              <p>
                Alguna trabajadera no tiene suplentes: primero hay que asignarle
                más costaleros.
              </p>
            </Alert>
          ) : (
            <p className="text-pequeno text-fg-muted">
              Tramos necesarios: <strong>{minimosFinitos}</strong> (el máximo de
              los mínimos de cada trabajadera). Con <strong>{total}</strong>{" "}
              tramos en el recorrido.
            </p>
          )}

          <FormField
            id="numero-tramos"
            label="Número de tramos del recorrido"
            helper="Mínimo 2: el primero es la salida y el último la entrada."
          >
            <Input
              id="numero-tramos"
              type="number"
              min={2}
              value={total}
              onChange={(event) => cambiarTotal(Number(event.target.value))}
            />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nombres de los tramos</CardTitle>
        </CardHeader>
        <CardBody>
          <Table
            columns={[
              { key: "ordinal", header: "#", align: "right" },
              { key: "nombre", header: "Nombre" },
              { key: "tipo", header: "Tipo" },
            ]}
          >
            {estado.tramos.map((tramo, indice) => (
              <TableRow key={tramo.id}>
                <TableCell>{tramo.ordinal}</TableCell>
                <TableCell>
                  <Input
                    aria-label={`Nombre del tramo ${tramo.ordinal}`}
                    value={tramo.name}
                    onChange={(event) => renombrar(indice, event.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    tone={
                      tramo.kind === "salida"
                        ? "info"
                        : tramo.kind === "entrada"
                          ? "primary"
                          : "neutral"
                    }
                  >
                    {tramo.kind}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              loading={cargando}
              onClick={() => void acciones.guardarTramos()}
              disabled={estado.tramos.length === 0}
            >
              Guardar tramos
            </Button>
            <p className="text-pequeno text-fg-muted">
              Los tramos que ya estaban guardados y no están en la propuesta no
              se borran aquí: se quitan en el apartado de tramos.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

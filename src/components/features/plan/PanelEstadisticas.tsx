/**
 * Panel de ESTADÍSTICAS de P5 (§9): descansos por persona, media,
 * dispersión por pool y global, solapamiento entre salida y entrada y el
 * cumplimiento de R1 a R5.
 */

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Table,
  TableCell,
  TableRow,
} from "@/components/ui";
import type { PlanStats } from "@/domain/modelo";

import type { PersonaPlan, TrabajadoraPlan } from "./tipos";

export type PropsPanelEstadisticas = {
  estadisticas: PlanStats;
  personas: PersonaPlan[];
  trabajadoras: TrabajadoraPlan[];
};

/** Panel de estadísticas del plan de relevos. */
export function PanelEstadisticas({
  estadisticas,
  personas,
  trabajadoras,
}: PropsPanelEstadisticas) {
  const nombrePorId = new Map(
    personas.map((persona) => [persona.id, persona.nombre]),
  );
  const descansos = personas.map((persona) => ({
    persona,
    total: estadisticas.descansosPorCostalero[persona.id] ?? 0,
  }));
  const suma = descansos.reduce((total, fila) => total + fila.total, 0);
  const media = descansos.length === 0 ? 0 : suma / descansos.length;

  const reglas = [
    {
      id: "R1",
      cumple: estadisticas.cumplimiento.r1,
      texto: "Cada relevo lo hace el pool de su trabajadera",
    },
    {
      id: "R2",
      cumple: estadisticas.cumplimiento.r2,
      texto: "Todos descansan al menos 2 veces",
    },
    {
      id: "R3",
      cumple: estadisticas.cumplimiento.r3,
      texto: "Nadie descansa dos tramos seguidos",
    },
    {
      id: "R4",
      cumple: estadisticas.cumplimiento.r4,
      texto: "Las dos boquillas no descansan a la vez",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Descansos por persona</CardTitle>
        </CardHeader>
        <CardBody>
          <Table
            columns={[
              { key: "costalero", header: "Costalero" },
              { key: "descansos", header: "Descansos", align: "right" },
            ]}
          >
            {descansos.map(({ persona, total }) => (
              <TableRow key={persona.id}>
                <TableCell>
                  {nombrePorId.get(persona.id) ?? persona.id}
                </TableCell>
                <TableCell className="text-right">{String(total)}</TableCell>
              </TableRow>
            ))}
          </Table>
          <p className="mt-3 text-cuerpo">
            {`Media de descansos: ${media.toFixed(2).replace(".", ",")}`}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equidad del reparto</CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="space-y-2 text-cuerpo">
            {trabajadoras.map((trabajadera) => (
              <div key={trabajadera.id} className="flex justify-between gap-4">
                <dt>{`Trabajadera ${String(trabajadera.position)}`}</dt>
                <dd className="text-fg-muted">
                  {`dispersión ${String(estadisticas.dispercionPorTrabajadera[trabajadera.id] ?? 0)}`}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt>Dispersión global</dt>
              <dd className="text-fg-muted">
                {String(estadisticas.dispercionGlobal)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Repiten salida y entrada</dt>
              <dd className="text-fg-muted">
                {`${String(estadisticas.solapamientoSalidaEntrada)} de ${String(estadisticas.cumplimiento.r5.maximo)}`}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento de las reglas</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2">
            {reglas.map((regla) => (
              <li
                key={regla.id}
                className="flex items-center gap-2 text-cuerpo"
              >
                <Badge tone={regla.cumple ? "success" : "danger"}>
                  {regla.cumple ? "Cumple" : "No cumple"}
                </Badge>
                <span className="font-medium">{regla.id}</span>
                <span className="text-fg-muted">{regla.texto}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-cuerpo">
              <Badge
                tone={
                  estadisticas.cumplimiento.r5.valor <=
                  estadisticas.cumplimiento.r5.maximo
                    ? "success"
                    : "warning"
                }
              >
                {`${String(estadisticas.cumplimiento.r5.valor)} de ${String(estadisticas.cumplimiento.r5.maximo)}`}
              </Badge>
              <span className="font-medium">R5</span>
              <span className="text-fg-muted">
                Los que hacen la salida no repiten en la entrada
              </span>
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

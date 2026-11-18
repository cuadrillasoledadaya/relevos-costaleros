/**
 * Vista POR TRAMO de P5 (§9): una columna por tramo y, dentro, una fila por
 * trabajadera con los nombres de los que van en el paso y los que descansan.
 */

import { Table, TableCell, TableRow } from "@/components/ui";

import type {
  PersonaPlan,
  PlanEnPantalla,
  TramoPlan,
  TrabajadoraPlan,
} from "./tipos";

export type PropsVistaPorTramo = {
  tramos: TramoPlan[];
  trabajadoras: TrabajadoraPlan[];
  personas: PersonaPlan[];
  plan: PlanEnPantalla;
};

/** Vista por tramo del plan de relevos. */
export function VistaPorTramo({
  tramos,
  trabajadoras,
  personas,
  plan,
}: PropsVistaPorTramo) {
  const nombrePorId = new Map(
    personas.map((persona) => [persona.id, persona.nombre]),
  );

  const columnas = [
    { key: "trabajadera", header: "Trabajadera" },
    ...tramos.map((tramo) => ({
      key: tramo.id,
      header: (
        <span>
          {tramo.ordinal}. {tramo.name}
          <span className="block text-pequeno font-normal text-fg-muted">
            {tramo.kind === "salida"
              ? "salida"
              : tramo.kind === "entrada"
                ? "entrada"
                : "normal"}
          </span>
        </span>
      ),
    })),
  ];

  return (
    <Table
      columns={columnas}
      caption="En cada tramo, los que van en el paso y los que descansan."
    >
      {trabajadoras.map((trabajadera) => (
        <TableRow key={trabajadera.id}>
          <TableCell>
            <span className="font-medium">
              {`Trabajadera ${String(trabajadera.position)}`}
            </span>
            <span className="block text-pequeno text-fg-muted">
              {`${String(trabajadera.carga)} en el paso`}
            </span>
          </TableCell>
          {tramos.map((tramo) => {
            const reparto = plan.porTrabajadera[tramo.id]?.[trabajadera.id];
            const enPaso = reparto?.enPaso ?? [];
            const descansan = reparto?.descansan ?? [];
            return (
              <TableCell key={tramo.id}>
                <ul className="space-y-0.5">
                  {enPaso.map((id) => (
                    <li key={id}>{nombrePorId.get(id) ?? id}</li>
                  ))}
                </ul>
                {descansan.length > 0 ? (
                  <p className="mt-1 text-pequeno text-fg-muted">
                    {`Descansan: ${descansan
                      .map((id) => nombrePorId.get(id) ?? id)
                      .join(", ")}`}
                  </p>
                ) : null}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </Table>
  );
}

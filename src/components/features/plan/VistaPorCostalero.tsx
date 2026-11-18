/**
 * Vista POR COSTALERO de P5 (§9): una fila por costalero con los tramos en
 * los que descansa.
 */

import { Table, TableCell, TableRow } from "@/components/ui";

import type { PersonaPlan, PlanEnPantalla, TramoPlan } from "./tipos";

export type PropsVistaPorCostalero = {
  tramos: TramoPlan[];
  personas: PersonaPlan[];
  plan: PlanEnPantalla;
};

/** Vista por costalero del plan de relevos. */
export function VistaPorCostalero({
  tramos,
  personas,
  plan,
}: PropsVistaPorCostalero) {
  const nombrePorId = new Map(
    personas.map((persona) => [persona.id, persona.nombre]),
  );

  const filas = personas.map((persona) => {
    const descansos = tramos.filter(
      (tramo) => plan.estados[tramo.id]?.[persona.id] === "descanso",
    );
    return { persona, descansos };
  });

  return (
    <Table
      columns={[
        { key: "costalero", header: "Costalero" },
        { key: "descansa", header: "Tramos en los que descansa" },
        { key: "total", header: "Descansos", align: "right" },
      ]}
      caption="Cada persona con los tramos en los que descansa."
    >
      {filas.map(({ persona, descansos }) => (
        <TableRow key={persona.id}>
          <TableCell>
            <span className="font-medium">
              {nombrePorId.get(persona.id) ?? persona.id}
            </span>
            {persona.esBoquilla ? (
              <span className="ml-2 text-pequeno text-fg-muted">boquilla</span>
            ) : null}
          </TableCell>
          <TableCell>
            {descansos.length === 0 ? (
              <span className="text-fg-muted">—</span>
            ) : (
              descansos.map((tramo) => tramo.name).join(", ")
            )}
          </TableCell>
          <TableCell className="text-right">
            {String(descansos.length)}
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
}

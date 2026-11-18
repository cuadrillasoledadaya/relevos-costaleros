"use client";

/**
 * Hoja de relevos del capataz (P6, §9): una hoja por trabajadera, con los
 * puestos de §6 en las columnas y los tramos en las filas.
 *
 * En el móvil la tabla se desplaza horizontalmente con la primera columna
 * fija; en papel sale una hoja por página (los estilos están en
 * `src/styles/print.css`, que importa esta propia pantalla).
 */

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { cn } from "@/components/ui/types";

import type { DatosHoja } from "./tipos";

export type PropsHojaDeRelevos = {
  datos: DatosHoja;
};

/** La hoja de relevos: un bloque imprimible por trabajadera. */
export function HojaDeRelevos({ datos }: PropsHojaDeRelevos) {
  const { paso, plan, hojas } = datos;
  /** `null` = se imprimen todas las hojas. */
  const [soloHoja, setSoloHoja] = useState<string | null>(null);

  /**
   * Imprime la hoja indicada (o todas).
   *
   * El print se pide en el siguiente tick, cuando el DOM ya refleja qué hoja
   * se imprime, y el estado se devuelve cuando se cierra el diálogo.
   */
  function imprimir(hojaId: string | null): void {
    if (typeof window === "undefined") return;
    setSoloHoja(hojaId);
    window.setTimeout(() => {
      window.print();
      setSoloHoja(null);
    }, 0);
  }

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-center justify-between gap-2"
        data-print="oculto"
      >
        <div>
          <h1 className="text-titulo font-semibold text-fg">
            {`Hoja de relevos · ${paso.nombre}`}
          </h1>
          <p className="text-pequeno text-fg-muted">
            {`${paso.cuadrilla} · ${String(paso.anio)} · versión ${String(plan.version)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => imprimir(null)}>
            Imprimir todas
          </Button>
          <a
            className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-pequeno text-fg"
            href={`/api/export/relevos.csv?planId=${plan.id}`}
            download
          >
            Exportar CSV de relevos
          </a>
          <a
            className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-pequeno text-fg"
            href={`/api/export/plan-por-costalero.csv?planId=${plan.id}`}
            download
          >
            Exportar CSV por costalero
          </a>
        </div>
      </div>

      {hojas.map((hoja) => (
        <Card
          key={hoja.id}
          className={cn(
            "hoja",
            soloHoja !== null && soloHoja !== hoja.id && "hidden",
          )}
        >
          <CardHeader>
            <CardTitle>{`Trabajadera ${String(hoja.position)}`}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-pequeno text-fg-muted">
                {`${paso.nombre} · ${paso.cuadrilla} · ${String(paso.anio)} · generado el ${datos.generado} · versión ${String(plan.version)}`}
              </p>
              <div className="flex items-center gap-2" data-print="oculto">
                {plan.status === "publicado" ? (
                  <Badge tone="success">Publicado</Badge>
                ) : (
                  <Badge tone="warning">Borrador</Badge>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => imprimir(hoja.id)}
                >
                  Imprimir
                </Button>
              </div>
            </div>

            <Table
              columns={[
                { key: "tramo", header: "Tramo" },
                ...hoja.puestos.map((puesto) => ({
                  key: `puesto-${String(puesto.indice)}`,
                  header: puesto.nombre,
                })),
              ]}
              caption={`Reparto de la trabajadera ${String(hoja.position)}`}
            >
              {hoja.filas.map((fila) => (
                <TableRow key={fila.tramoId}>
                  <TableHeaderCell
                    scope="row"
                    className="sticky left-0 z-header bg-surface"
                  >
                    {`${String(fila.ordinal)}. ${fila.tramo}`}
                  </TableHeaderCell>
                  {hoja.puestos.map((puesto) => {
                    const persona = fila.personas[puesto.indice];
                    return (
                      <TableCell key={puesto.indice}>
                        {persona ? persona.nombre : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </Table>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

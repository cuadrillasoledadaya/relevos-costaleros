"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";

import { boquillasCompletas } from "./estado";
import type { PropiedadesPaso } from "./tipos";

/**
 * Paso 4 del wizard (P3): las 2 boquillas del paso. Son costaleros del propio
 * paso y tienen que ser distintos (F-5).
 */
export function PasoBoquillas({
  estado,
  datos,
  factibilidad,
  acciones,
  cargando,
  actualizar,
}: PropiedadesPaso) {
  const enElPaso = new Set(Object.values(estado.reparto).flat());
  const costalerosDelPaso = datos.costaleros.filter((costalero) =>
    enElPaso.has(costalero.id),
  );
  const precondicionF5 = factibilidad.precondiciones.find(
    (precondicion) => precondicion.id === "F-5",
  );

  const alternar = (costaleroId: string) => {
    const actuales = estado.boquillas;
    const nuevas = actuales.includes(costaleroId)
      ? actuales.filter((id) => id !== costaleroId)
      : [...actuales, costaleroId];
    actualizar({ boquillas: nuevas });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Boquillas del paso</CardTitle>
          <p className="text-pequeno text-fg-muted">
            Las 2 boquillas son costaleros del paso: mandan bajo el paso y
            transmiten las órdenes del capataz.
          </p>
        </CardHeader>
        <CardBody>
          {costalerosDelPaso.length === 0 ? (
            <Alert tone="warning" title="Todavía no hay costaleros en el paso">
              <p>
                Asigna costaleros a los pools en el paso 3 del wizard para poder
                elegir las boquillas.
              </p>
            </Alert>
          ) : (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-pequeno font-medium text-fg">
                Elige las 2 boquillas ({estado.boquillas.length} de 2)
              </legend>
              {costalerosDelPaso.map((costalero) => (
                <Checkbox
                  key={costalero.id}
                  id={`boquilla-${costalero.id}`}
                  label={costalero.full_name}
                  description={
                    costalero.nickname ? costalero.nickname : undefined
                  }
                  checked={estado.boquillas.includes(costalero.id)}
                  onChange={() => alternar(costalero.id)}
                />
              ))}
            </fieldset>
          )}
        </CardBody>
      </Card>

      {precondicionF5 && !precondicionF5.cumple ? (
        <Alert tone="danger" title="F-5 · boquillas">
          <p>{precondicionF5.mensaje}</p>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          loading={cargando}
          disabled={!boquillasCompletas(estado.boquillas)}
          onClick={() => void acciones.guardarBoquillas()}
        >
          Guardar boquillas
        </Button>
        <p className="text-pequeno text-fg-muted">
          Las dos boquillas no pueden descansar a la vez (regla R4).
        </p>
      </div>
    </div>
  );
}

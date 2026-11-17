"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

import type { PropiedadesPaso } from "./tipos";

/**
 * Paso 1 del wizard (P3): nombre, año y número de trabajaderas del paso
 * (§9). El número de trabajaderas va de 1 a 12 y por defecto son 6.
 */
export function PasoDatos({
  estado,
  acciones,
  cargando,
  actualizar,
}: PropiedadesPaso) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del paso</CardTitle>
        <p className="text-pequeno text-fg-muted">
          El nombre del paso, la temporada y cuántas trabajaderas tiene.
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void acciones.guardarDatos();
          }}
        >
          <FormField
            id="paso-nombre"
            label="Nombre del paso"
            required
            helper="Por ejemplo: Cristo de la Salud."
          >
            <Input
              id="paso-nombre"
              value={estado.nombre}
              onChange={(event) => actualizar({ nombre: event.target.value })}
            />
          </FormField>

          <FormField
            id="paso-anio"
            label="Año"
            required
            helper="La temporada a la que pertenece el paso."
          >
            <Input
              id="paso-anio"
              type="number"
              value={estado.anio}
              onChange={(event) =>
                actualizar({ anio: Number(event.target.value) })
              }
            />
          </FormField>

          <FormField
            id="paso-num-trabajaderas"
            label="Número de trabajaderas"
            helper="De 1 a 12. Por defecto 6. Al guardar se recalculan los puestos y se avisa de los que quedan sin cubrir."
          >
            <Input
              id="paso-num-trabajaderas"
              type="number"
              min={1}
              max={12}
              value={estado.numTrabajaderas}
              onChange={(event) =>
                actualizar({ numTrabajaderas: Number(event.target.value) })
              }
            />
          </FormField>

          <div>
            <Button type="submit" loading={cargando}>
              Guardar datos del paso
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

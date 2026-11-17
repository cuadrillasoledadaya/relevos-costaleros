"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

import { TEXTO_TIPO_TRABAJADERA, tipoDe } from "./estado";
import type { PropiedadesPaso } from "./tipos";

/**
 * Paso 2 del wizard (P3): cuántos costaleros tiene el paso y cómo se reparten
 * por trabajadera. Marca en rojo las trabajaderas sin suplente
 * (F-4: `pool >= carga + 1`) y avisa de los puestos sin cubrir (§6, P-3).
 */
export function PasoReparto({
  estado,
  datos,
  acciones,
  cargando,
  actualizar,
}: PropiedadesPaso) {
  const total = datos.trabajaderas.length;
  const asignados = datos.trabajaderas.reduce(
    (suma, trabajadera) => suma + (estado.reparto[trabajadera.id]?.length ?? 0),
    0,
  );
  const disponibles = datos.costaleros.length - asignados;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Costaleros del paso</CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-3 text-pequeno">
            <div>
              <dt className="text-fg-muted">En el paso</dt>
              <dd className="text-cabecera font-semibold text-fg">
                {asignados}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">Sin asignar en la cuadrilla</dt>
              <dd className="text-cabecera font-semibold text-fg">
                {disponibles}
              </dd>
            </div>
          </dl>
          <p className="text-pequeno text-fg-muted">
            El reparto se asigna en el paso 3 del wizard. Aquí se ve cuántas
            trabajaderas hay, su carga y si les falta un suplente.
          </p>
        </CardBody>
      </Card>

      {datos.trabajaderas.map((trabajadera) => {
        const pool = estado.reparto[trabajadera.id]?.length ?? 0;
        const carga = estado.cargas[trabajadera.id] ?? trabajadera.carga;
        const faltanSuplentes = carga + 1 - pool;
        const sinCubrir = carga - pool;
        return (
          <Card key={trabajadera.id}>
            <CardHeader>
              <CardTitle>
                Trabajadera {trabajadera.position} ·{" "}
                {TEXTO_TIPO_TRABAJADERA[tipoDe(trabajadera.position, total)]}
              </CardTitle>
              <p className="text-pequeno text-fg-muted">
                Pool: {pool} costaleros · carga: {carga}
              </p>
            </CardHeader>
            <CardBody>
              <FormField
                id={`carga-${trabajadera.id}`}
                label="Carga (costaleros dentro del paso a la vez)"
                helper="De 1 a 5. Por defecto 5."
              >
                <Input
                  id={`carga-${trabajadera.id}`}
                  type="number"
                  min={1}
                  max={5}
                  value={carga}
                  onChange={(event) =>
                    actualizar({
                      cargas: {
                        ...estado.cargas,
                        [trabajadera.id]: Number(event.target.value),
                      },
                    })
                  }
                />
              </FormField>

              {faltanSuplentes > 0 ? (
                <Alert tone="danger" title="F-4 · falta un suplente">
                  <p>
                    Faltan {faltanSuplentes} suplente
                    {faltanSuplentes === 1 ? "" : "s"} en esta trabajadera: con{" "}
                    {pool} costaleros y carga {carga} no se puede relevar.
                  </p>
                </Alert>
              ) : null}

              {sinCubrir > 0 ? (
                <Alert tone="warning" title="Puestos sin cubrir">
                  <p>
                    Con {pool} costaleros quedan {sinCubrir} puesto
                    {sinCubrir === 1 ? "" : "s"} sin cubrir en esta trabajadera.
                  </p>
                </Alert>
              ) : null}
            </CardBody>
          </Card>
        );
      })}

      {datos.trabajaderas.length === 0 ? (
        <Alert tone="warning" title="El paso no tiene trabajaderas">
          <p>
            Guarda los datos del paso en el paso 1 del wizard para crear las
            trabajaderas.
          </p>
        </Alert>
      ) : (
        <div>
          <Button
            variant="secondary"
            loading={cargando}
            onClick={() => void acciones.guardarReparto()}
          >
            Guardar reparto y cargas
          </Button>
        </div>
      )}

      <p className="text-pequeno text-fg-muted">
        Estado del reparto:{" "}
        {datos.trabajaderas.every(
          (trabajadera) =>
            (estado.reparto[trabajadera.id]?.length ?? 0) >=
            (estado.cargas[trabajadera.id] ?? trabajadera.carga),
        ) ? (
          <Badge tone="success">todas las trabajaderas tienen carga</Badge>
        ) : (
          <Badge tone="warning">hay trabajaderas sin repartir</Badge>
        )}
      </p>
    </div>
  );
}

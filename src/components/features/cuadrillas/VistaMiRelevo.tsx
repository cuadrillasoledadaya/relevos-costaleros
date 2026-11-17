import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import type { ResultadoMiRelevo } from "@/server/actions/costalero";

export type VistaMiRelevoProps = {
  resultado: Extract<ResultadoMiRelevo, { estado: "ok" }>;
};

export function VistaMiRelevo({ resultado }: VistaMiRelevoProps) {
  const sinTramos = resultado.planes.every((plan) => plan.tramos.length === 0);

  if (sinTramos) {
    return (
      <EmptyState
        title="Tu plan todavía no tiene tramos"
        description="El capataz tiene que publicar un plan de relevos para que puedas verlo."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-pequeno text-fg-muted">
        Sólo se muestran los tramos de {resultado.costalero.full_name}.
      </p>
      {resultado.planes.map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{plan.pasoNombre}</CardTitle>
              <Badge tone="primary">Versión {plan.version}</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <ol className="grid gap-2">
              {plan.tramos.map((tramo) => (
                <li
                  key={tramo.id}
                  className="flex flex-col gap-1 rounded-md border border-border bg-surface-sunken p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-fg">
                      {tramo.ordinal}. {tramo.nombre}
                    </p>
                    <p className="text-pequeno text-fg-muted">
                      {tramo.kind === "salida"
                        ? "Salida"
                        : tramo.kind === "entrada"
                          ? "Entrada"
                          : "Tramo"}
                    </p>
                  </div>
                  <Badge
                    tone={tramo.estado === "en_paso" ? "primary" : "success"}
                  >
                    {tramo.estado === "en_paso"
                      ? "Te toca entrar"
                      : "Descansas"}
                  </Badge>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

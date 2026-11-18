/**
 * HISTORIAL de versiones del plan (P5, §9): la más reciente primero, con la
 * publicada marcada y un botón para publicar cada versión.
 */

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui";

import type { VersionPlan } from "./tipos";

export type PropsHistorialVersiones = {
  versiones: VersionPlan[];
  /** Id de la versión que se está viendo. */
  versionVisibleId: string | null;
  /** Se está publicando alguna versión. */
  publicando: boolean;
  /** Publica la versión indicada. */
  onPublicar: (planId: string) => void;
};

/** Historial de versiones del plan de relevos. */
export function HistorialVersiones({
  versiones,
  versionVisibleId,
  publicando,
  onPublicar,
}: PropsHistorialVersiones) {
  if (versiones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de versiones</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-cuerpo text-fg-muted">
            Todavía no hay ningún plan calculado para este paso.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de versiones</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="space-y-3">
          {versiones.map((version) => {
            const publicada = version.status === "publicado";
            const visible = version.id === versionVisibleId;
            return (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-fg">
                    {`Versión ${String(version.version)}`}
                    {publicada ? (
                      <Badge tone="success" className="ml-2">
                        Publicada
                      </Badge>
                    ) : null}
                    {visible ? (
                      <Badge tone="primary" className="ml-2">
                        En pantalla
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-pequeno text-fg-muted">
                    {`Semilla ${String(version.seed)} · ${new Date(version.created_at).toLocaleString("es-ES")}`}
                  </p>
                </div>
                {publicada ? null : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={publicando}
                    loadingText="Publicando…"
                    onClick={() => onPublicar(version.id)}
                  >
                    Publicar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

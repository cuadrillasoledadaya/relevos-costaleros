"use client";

import { useEffect } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

/**
 * Estado de error de la configuración del paso (§9): mensaje en español y
 * botón de reintento.
 */
export default function ErrorConfiguracion({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>No se ha podido cargar la configuración</CardTitle>
      </CardHeader>
      <CardBody>
        <Alert tone="danger" title="Ha habido un problema">
          <p>
            No se han podido leer los datos del paso. Vuelve a intentarlo; si el
            problema sigue, revisa la conexión con la base de datos.
          </p>
        </Alert>
        <div>
          <Button variant="secondary" onClick={() => reset()}>
            Reintentar
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

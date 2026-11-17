"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { crearPaso } from "@/server/actions/paso";

/** Número de trabajaderas por defecto (§9: 6). */
const TRABAJADERAS_POR_DEFECTO = 6;

/**
 * Alta de un paso: nombre, año y número de trabajaderas. Se usa cuando
 * el capataz abre el wizard sin un paso creado todavía.
 */
export function CrearPaso({ cuadrillaId }: { cuadrillaId: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [numTrabajaderas, setNumTrabajaderas] = useState(
    TRABAJADERAS_POR_DEFECTO,
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const resultado = await crearPaso({
        cuadrillaId,
        nombre,
        anio,
        numTrabajaderas,
      });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      router.push(
        `/cuadrillas/${cuadrillaId}/paso/${resultado.datos.pasoId}/configuracion`,
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear paso</CardTitle>
        <p className="text-pequeno text-fg-muted">
          Un paso son las trabajaderas por las que se reparten los costaleros de
          la cuadrilla.
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => void enviar(event)}
        >
          <FormField id="nuevo-nombre" label="Nombre del paso" required>
            <Input
              id="nuevo-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
            />
          </FormField>
          <FormField id="nuevo-anio" label="Año" required>
            <Input
              id="nuevo-anio"
              type="number"
              value={anio}
              onChange={(event) => setAnio(Number(event.target.value))}
            />
          </FormField>
          <FormField
            id="nuevo-trabajaderas"
            label="Número de trabajaderas"
            helper="De 1 a 12. Por defecto 6."
          >
            <Input
              id="nuevo-trabajaderas"
              type="number"
              min={1}
              max={12}
              value={numTrabajaderas}
              onChange={(event) =>
                setNumTrabajaderas(Number(event.target.value))
              }
            />
          </FormField>

          {error ? (
            <Alert tone="danger" title="No se ha podido crear el paso">
              <p>{error}</p>
            </Alert>
          ) : null}

          <div>
            <Button type="submit" loading={cargando}>
              Crear paso y configurar
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

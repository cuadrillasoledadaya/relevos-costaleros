"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert, Button, FormField, Input, Textarea } from "@/components/ui";
import type { EstadoAccion } from "@/server/actions/cuadrilla";

export type CuadrillaFormulario = {
  name: string;
  season: number;
  notes: string | null;
};

export type FormularioCuadrillaProps = {
  accion: (estado: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  cuadrilla?: CuadrillaFormulario;
  titulo?: string;
};

export function FormularioCuadrilla({
  accion,
  cuadrilla,
  titulo = "Datos de la cuadrilla",
}: FormularioCuadrillaProps) {
  const router = useRouter();
  const [estado, enviar, pendiente] = useActionState(accion, {
    ok: false,
  } satisfies EstadoAccion);

  useEffect(() => {
    if (estado.ok && estado.redireccion) {
      router.push(estado.redireccion);
    }
  }, [estado.ok, estado.redireccion, router]);

  return (
    <form action={enviar} className="grid gap-4">
      <h2 className="text-cabecera font-semibold text-fg">{titulo}</h2>

      <FormField
        id="cuadrilla-name"
        label="Nombre de la cuadrilla"
        error={estado.errores?.name}
        required
      >
        <Input
          id="cuadrilla-name"
          name="name"
          defaultValue={cuadrilla?.name}
          autoComplete="organization"
          required
        />
      </FormField>

      <FormField
        id="cuadrilla-season"
        label="Año"
        error={estado.errores?.season}
        required
      >
        <Input
          id="cuadrilla-season"
          name="season"
          type="number"
          inputMode="numeric"
          defaultValue={cuadrilla?.season ?? new Date().getFullYear()}
          required
        />
      </FormField>

      <FormField
        id="cuadrilla-notes"
        label="Notas"
        helper="Cualquier información útil sobre la cuadrilla."
        error={estado.errores?.notes}
      >
        <Textarea
          id="cuadrilla-notes"
          name="notes"
          defaultValue={cuadrilla?.notes ?? ""}
        />
      </FormField>

      {estado.mensaje ? (
        <Alert tone={estado.ok ? "success" : "danger"}>{estado.mensaje}</Alert>
      ) : null}

      <Button type="submit" loading={pendiente} className="sm:self-start">
        {cuadrilla ? "Guardar cambios" : "Crear cuadrilla"}
      </Button>
    </form>
  );
}

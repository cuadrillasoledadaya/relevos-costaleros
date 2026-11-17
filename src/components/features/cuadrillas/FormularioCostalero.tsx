"use client";

import { useActionState } from "react";

import { Alert, Button, FormField, Input, Textarea } from "@/components/ui";
import type { EstadoAccion } from "@/server/actions/cuadrilla";
import type { CostaleroResumen } from "./ListaCostaleros";

export type FormularioCostaleroProps = {
  accion: (estado: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  costalero?: CostaleroResumen;
  onCancelar?: () => void;
};

export function FormularioCostalero({
  accion,
  costalero,
  onCancelar,
}: FormularioCostaleroProps) {
  const [estado, enviar, pendiente] = useActionState(accion, {
    ok: false,
  } satisfies EstadoAccion);

  return (
    <form action={enviar} className="grid gap-4">
      {costalero ? (
        <input type="hidden" name="costalero_id" value={costalero.id} />
      ) : null}
      <h2 className="text-cabecera font-semibold text-fg">
        {costalero ? `Editar ${costalero.full_name}` : "Añadir costalero"}
      </h2>

      <FormField
        id="costalero-full-name"
        label="Nombre completo"
        error={estado.errores?.full_name}
        required
      >
        <Input
          id="costalero-full-name"
          name="full_name"
          defaultValue={costalero?.full_name}
          autoComplete="name"
          required
        />
      </FormField>

      <FormField
        id="costalero-nickname"
        label="Apodo"
        error={estado.errores?.nickname}
      >
        <Input
          id="costalero-nickname"
          name="nickname"
          defaultValue={costalero?.nickname ?? ""}
        />
      </FormField>

      <FormField
        id="costalero-phone"
        label="Teléfono"
        error={estado.errores?.phone}
      >
        <Input
          id="costalero-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={costalero?.phone ?? ""}
        />
      </FormField>

      <FormField
        id="costalero-email"
        label="Correo de una cuenta existente"
        helper="Opcional. Permite vincular la cuenta y evitar que una persona esté en dos cuadrillas. Si aún no tiene cuenta, deja el campo en blanco."
        error={estado.errores?.email}
      >
        <Input
          id="costalero-email"
          name="email"
          type="email"
          autoComplete="email"
        />
      </FormField>

      <FormField
        id="costalero-notes"
        label="Notas"
        error={estado.errores?.notes}
      >
        <Textarea
          id="costalero-notes"
          name="notes"
          defaultValue={costalero?.notes ?? ""}
        />
      </FormField>

      {estado.mensaje ? (
        <Alert tone={estado.ok ? "success" : "danger"}>{estado.mensaje}</Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={pendiente}>
          {costalero ? "Guardar cambios" : "Añadir costalero"}
        </Button>
        {onCancelar ? (
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui";

type AccionLogout = (formData: FormData) => Promise<void>;

export type CerrarSesionProps = {
  accion: AccionLogout;
};

export function CerrarSesion({ accion }: CerrarSesionProps) {
  return (
    <form action={accion}>
      <BotonEnviarLogout />
    </form>
  );
}

function BotonEnviarLogout() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" loading={pending}>
      Cerrar sesión
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

/** Botón que vuelve a pedir los datos al servidor tras un error de carga. */
export function BotonReintentar() {
  const router = useRouter();
  return (
    <Button variant="secondary" onClick={() => router.refresh()}>
      Reintentar
    </Button>
  );
}

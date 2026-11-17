import type { Metadata } from "next";

import { FormularioAcceso } from "@/components/features/auth/FormularioAcceso";
import { Alert } from "@/components/ui";
import { crearCuentaCostalero } from "@/server/actions/costalero";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <header className="mb-6 text-center">
        <h1 className="text-titulo font-semibold text-fg">
          Relevos de costaleros
        </h1>
        <p className="mt-2 text-cuerpo text-fg-muted">
          Entra para gestionar tu cuadrilla o consultar tu relevo.
        </p>
      </header>

      {error === "configuracion" ? (
        <div className="mb-4">
          <Alert tone="danger" title="Falta configurar Supabase">
            El inicio de sesión no está disponible hasta que el proyecto tenga
            sus variables de entorno.
          </Alert>
        </div>
      ) : null}

      <FormularioAcceso accionCrearCuenta={crearCuentaCostalero} />
    </main>
  );
}

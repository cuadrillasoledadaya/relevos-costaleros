import type { ReactNode } from "react";

import { CabeceraPaso } from "@/components/features/configuracion/CabeceraPaso";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { createServerSupabaseClient } from "@/server/supabase/server";

/**
 * Cabecera del paso (P3): nombre del paso, selector de paso y enlaces a las
 * secciones Tramos, Plan y Hoja. La comparten W5, W6, W7 y W8.
 */
export default async function LayoutPaso({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ cuadrillaId: string; pasoId: string }>;
}) {
  const { cuadrillaId, pasoId } = await params;

  let nombre = "Paso";
  let pasos: Array<{ id: string; name: string }> = [];
  try {
    const cliente = await createServerSupabaseClient();
    const repositorio = crearRepositorioPasos(cliente);
    const lista = await repositorio.listarPorCuadrilla(cuadrillaId);
    pasos = lista.data.map((paso) => ({ id: paso.id, name: paso.name }));
    nombre = lista.data.find((paso) => paso.id === pasoId)?.name ?? "Paso";
  } catch {
    // Sin conexión con la base de datos: la cabecera mínima no impide leer el
    // mensaje de error de la pantalla.
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraPaso
        nombre={nombre}
        pasos={pasos}
        pasoId={pasoId}
        cuadrillaId={cuadrillaId}
      />
      {children}
    </div>
  );
}

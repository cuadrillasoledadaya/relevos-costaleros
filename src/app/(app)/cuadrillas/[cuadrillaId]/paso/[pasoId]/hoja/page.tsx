import "@/styles/print.css";

import { BotonReintentar } from "@/components/features/configuracion/BotonReintentar";
import { cargarSesion } from "@/components/features/cuadrillas/sesion";
import { HojaDeRelevos } from "@/components/features/hoja/HojaDeRelevos";
import type { DatosHoja } from "@/components/features/hoja/tipos";
import { Alert, EmptyState } from "@/components/ui";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { crearRepositorioPlanes } from "@/server/repos/planes";
import { leerPlanParaExportar } from "@/server/hoja/plan";
import { createServerSupabaseClient } from "@/server/supabase/server";

/**
 * P6 — Hoja de relevos del capataz (§9).
 *
 * Una hoja por trabajadera, con los puestos de §6 en las columnas y los
 * tramos en las filas: es el papel que el capataz reparte. En pantalla se
 * desplaza en horizontal; en papel sale una hoja por página (los estilos
 * están en `src/styles/print.css`).
 *
 * La hoja sale del plan **guardado en la base de datos** y verificado: si el
 * plan ya no encaja con el paso, no se imprime.
 */
export default async function PageHoja({
  params,
  searchParams,
}: {
  params: Promise<{ cuadrillaId: string; pasoId: string }>;
  searchParams: Promise<{ planId?: string | string[] }>;
}) {
  const { cuadrillaId, pasoId } = await params;
  const consulta = await searchParams;

  const sesion = await cargarSesion();
  if (!sesion) {
    return (
      <Alert tone="danger" title="Sesión no válida">
        Vuelve a entrar para continuar.
      </Alert>
    );
  }
  if (sesion.perfil?.role !== "capataz") {
    return (
      <Alert tone="warning" title="Sin permisos">
        Tu cuenta de costalero no puede imprimir la hoja de relevos.
      </Alert>
    );
  }

  let datos: DatosHoja;

  try {
    const cliente = await createServerSupabaseClient();
    const pasos = crearRepositorioPasos(cliente);
    const pasoResultado = await pasos.obtenerPorId(pasoId);
    const paso = pasoResultado.data;

    if (!paso) {
      return (
        <EmptyState
          title="No se ha encontrado este paso"
          description="Puede que el paso sea de otra cuadrilla o que se haya borrado."
          action={<BotonReintentar />}
        />
      );
    }
    if (paso.cuadrilla_id !== cuadrillaId) {
      return (
        <EmptyState
          title="Este paso no es de la cuadrilla"
          description="No tienes permiso para ver su hoja de relevos."
          action={<BotonReintentar />}
        />
      );
    }

    // La versión de la hoja: la que se pide en la URL, si existe; si no, la
    // publicada; si no, la más reciente.
    const planes = crearRepositorioPlanes(cliente);
    const historial = await planes.listar({ pasoId });
    if (historial.error) throw new Error(historial.error.message);
    const pedida =
      typeof consulta.planId === "string" ? consulta.planId : undefined;
    const elegida =
      historial.data.find((plan) => plan.id === pedida) ??
      historial.data.find((plan) => plan.status === "publicado") ??
      historial.data[0];

    if (!elegida) {
      return (
        <EmptyState
          title="Este paso todavía no tiene plan"
          description="Calcula el plan de relevos y vuelve aquí para imprimir la hoja."
          action={
            <a
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-cuerpo text-primary-fg"
              href={`/cuadrillas/${cuadrillaId}/paso/${pasoId}/plan`}
            >
              Ir al plan de relevos
            </a>
          }
        />
      );
    }

    const lectura = await leerPlanParaExportar(
      cliente,
      elegida.id,
      sesion.user.id,
    );
    if (!lectura.ok) {
      return (
        <EmptyState
          title="No se ha podido preparar la hoja"
          description={lectura.error}
          action={<BotonReintentar />}
        />
      );
    }

    datos = {
      paso: lectura.datos.paso,
      plan: lectura.datos.plan,
      hojas: lectura.datos.hojas,
      generado: new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  } catch (error) {
    console.error("No se ha podido cargar la hoja de relevos", error);
    return (
      <EmptyState
        title="No se ha podido cargar la hoja"
        description="Ha habido un problema al leer los datos."
        action={<BotonReintentar />}
      />
    );
  }

  return <HojaDeRelevos datos={datos} />;
}

import { BotonReintentar } from "@/components/features/configuracion/BotonReintentar";
import { cargarSesion } from "@/components/features/cuadrillas/sesion";
import { PantallaPlan } from "@/components/features/plan/PantallaPlan";
import type { DatosPantallaPlan } from "@/components/features/plan/tipos";
import { Alert, EmptyState } from "@/components/ui";
import { SEMILLA_POR_DEFECTO } from "@/domain/solver";
import { crearRepositorioAsignaciones } from "@/server/repos/asignaciones";
import { crearRepositorioCostaleros } from "@/server/repos/costaleros";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { crearRepositorioPlanes } from "@/server/repos/planes";
import { crearRepositorioTrabajaderas } from "@/server/repos/trabajaderas";
import { crearRepositorioTramos } from "@/server/repos/tramos";
import { leerPlanDeLaBase } from "@/server/plan/lectura";
import { createServerSupabaseClient } from "@/server/supabase/server";

/**
 * P5 — Pantalla principal del plan de relevos (§9).
 *
 * El servidor es la autoridad: la pantalla no calcula nada en el navegador
 * (§13.3). Lee el paso con sus trabajaderas, sus pools y sus tramos, el
 * historial de versiones del plan y **el plan guardado**, que vuelve a
 * verificar con `verificarPlan` (S-5): si no lo pasa, la pantalla no lo
 * muestra.
 */
export default async function PagePlan({
  params,
  searchParams,
}: {
  params: Promise<{ cuadrillaId: string; pasoId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
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
        Tu cuenta de costalero no puede gestionar el plan de relevos.
      </Alert>
    );
  }

  let datos: DatosPantallaPlan;

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
          description="No tienes permiso para ver su plan de relevos."
          action={<BotonReintentar />}
        />
      );
    }

    const trabajaderas = crearRepositorioTrabajaderas(cliente);
    const asignaciones = crearRepositorioAsignaciones(cliente);
    const tramos = crearRepositorioTramos(cliente);
    const costaleros = crearRepositorioCostaleros(cliente);
    const planes = crearRepositorioPlanes(cliente);

    const listaTrabajadoras = await trabajaderas.listarPorPaso(pasoId);
    if (listaTrabajadoras.error)
      throw new Error(listaTrabajadoras.error.message);
    const listaTramos = await tramos.listarPorPaso(pasoId);
    if (listaTramos.error) throw new Error(listaTramos.error.message);
    const listaCostaleros = await costaleros.listarPorCuadrilla(
      paso.cuadrilla_id,
      { active: true },
    );
    if (listaCostaleros.error) throw new Error(listaCostaleros.error.message);
    const historial = await planes.listar({ pasoId });
    if (historial.error) throw new Error(historial.error.message);

    const asignacionesPorTrabajadera = await Promise.all(
      listaTrabajadoras.data.map((trabajadera) =>
        asignaciones.listarPorTrabajadera(trabajadera.id),
      ),
    );
    if (asignacionesPorTrabajadera.some((resultado) => resultado.error)) {
      throw new Error("No se han podido cargar las asignaciones del paso.");
    }

    const nombrePorCostalero = new Map(
      listaCostaleros.data.map((costalero) => [
        costalero.id,
        costalero.full_name,
      ]),
    );
    const boquillas = new Set<string>();
    const pools = listaTrabajadoras.data.map((trabajadera, indice) => {
      const asignadas = asignacionesPorTrabajadera[indice]?.data ?? [];
      for (const asignacion of asignadas) {
        if (asignacion.is_boquilla) boquillas.add(asignacion.costalero_id);
      }
      const ids = asignadas.map((asignacion) => asignacion.costalero_id);
      ids.sort((a, b) =>
        (nombrePorCostalero.get(a) ?? "").localeCompare(
          nombrePorCostalero.get(b) ?? "",
          "es",
        ),
      );
      return {
        id: trabajadera.id,
        position: trabajadera.position,
        carga: trabajadera.carga,
        pool: ids,
      };
    });

    const versiones = historial.data.map((plan) => ({
      id: plan.id,
      version: plan.version,
      status: plan.status,
      seed: plan.seed,
      created_at: plan.created_at,
    }));

    // La versión de la pantalla: la que se pide en la URL, si existe; si no,
    // la publicada; si no, la más reciente.
    const pedida =
      typeof consulta.version === "string" ? consulta.version : undefined;
    const seleccionada =
      versiones.find((version) => version.id === pedida) ??
      versiones.find((version) => version.status === "publicado") ??
      versiones[0];

    let plan = null;
    let estadisticas = null;
    let planCumple = true;
    if (seleccionada) {
      const lectura = await leerPlanDeLaBase(cliente, seleccionada.id);
      if (!lectura.ok) throw new Error(lectura.error);
      plan = {
        id: seleccionada.id,
        version: lectura.leido.version,
        status: lectura.leido.status,
        seed: lectura.leido.seed,
        estados: lectura.leido.plan.estados,
        porTrabajadera: lectura.leido.plan.porTrabajadera,
      };
      estadisticas = lectura.leido.stats;
      planCumple = lectura.cumple;
    }

    datos = {
      paso: {
        id: paso.id,
        cuadrilla_id: paso.cuadrilla_id,
        name: paso.name,
        season: paso.season,
      },
      trabajadoras: pools,
      tramos: listaTramos.data.map((tramo) => ({
        id: tramo.id,
        name: tramo.name,
        ordinal: tramo.ordinal,
        kind: tramo.kind,
      })),
      personas: [
        ...new Set(pools.flatMap((trabajadera) => trabajadera.pool)),
      ].map((id) => ({
        id,
        nombre: nombrePorCostalero.get(id) ?? id,
        esBoquilla: boquillas.has(id),
      })),
      versiones,
      plan,
      estadisticas,
      planCumple,
      semillaPorDefecto: SEMILLA_POR_DEFECTO,
    };
  } catch (error) {
    console.error("No se ha podido cargar el plan de relevos", error);
    return (
      <EmptyState
        title="No se ha podido cargar el plan"
        description="Ha habido un problema al leer los datos."
        action={<BotonReintentar />}
      />
    );
  }

  return <PantallaPlan {...datos} cuadrillaId={cuadrillaId} pasoId={pasoId} />;
}

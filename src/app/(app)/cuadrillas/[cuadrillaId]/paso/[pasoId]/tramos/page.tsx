import { BotonReintentar } from "@/components/features/configuracion/BotonReintentar";
import { PantallaTramos } from "@/components/features/tramos/PantallaTramos";
import type { DatosPantallaTramos } from "@/components/features/tramos/tipos";
import { EmptyState } from "@/components/ui/EmptyState";
import { avisosDeCoherencia } from "@/domain/tramos";
import { crearRepositorioAsignaciones } from "@/server/repos/asignaciones";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { crearRepositorioTrabajaderas } from "@/server/repos/trabajaderas";
import { crearRepositorioTramos } from "@/server/repos/tramos";
import { createServerSupabaseClient } from "@/server/supabase/server";

/**
 * P4 — Apartado de tramos (§9).
 *
 * Carga el paso, sus trabajaderas con los pools, las boquillas elegidas y el
 * recorrido guardado. La comprobación de pertenencia a la cuadrilla se hace
 * antes de leer los datos de la ruta.
 */
export default async function PageTramos({
  params,
}: {
  params: Promise<{ cuadrillaId: string; pasoId: string }>;
}) {
  const { cuadrillaId, pasoId } = await params;

  let datos: DatosPantallaTramos;

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
          description="No tienes permiso para ver sus tramos."
          action={<BotonReintentar />}
        />
      );
    }

    const trabajaderas = crearRepositorioTrabajaderas(cliente);
    const asignaciones = crearRepositorioAsignaciones(cliente);
    const tramos = crearRepositorioTramos(cliente);

    const [listaTrabajadoras, listaTramos] = await Promise.all([
      trabajaderas.listarPorPaso(pasoId),
      tramos.listarPorPaso(pasoId),
    ]);
    if (listaTrabajadoras.error)
      throw new Error(listaTrabajadoras.error.message);
    if (listaTramos.error) throw new Error(listaTramos.error.message);

    const asignacionesPorTrabajadera = await Promise.all(
      listaTrabajadoras.data.map((trabajadera) =>
        asignaciones.listarPorTrabajadera(trabajadera.id),
      ),
    );
    if (asignacionesPorTrabajadera.some((resultado) => resultado.error)) {
      throw new Error("No se han podido cargar las asignaciones del paso.");
    }

    const pools = listaTrabajadoras.data.map((trabajadera, indice) => {
      const asignadas = asignacionesPorTrabajadera[indice]?.data ?? [];
      return {
        id: trabajadera.id,
        position: trabajadera.position,
        carga: trabajadera.carga,
        pool: asignadas.map((asignacion) => asignacion.costalero_id),
      };
    });
    const boquillas = asignacionesPorTrabajadera.flatMap((resultado) =>
      resultado.data
        .filter((asignacion) => asignacion.is_boquilla)
        .map((asignacion) => asignacion.costalero_id),
    );
    const tramosPantalla = listaTramos.data.map((tramo) => ({
      id: tramo.id,
      name: tramo.name,
      ordinal: tramo.ordinal,
      kind: tramo.kind,
    }));

    datos = {
      paso: {
        id: paso.id,
        cuadrilla_id: paso.cuadrilla_id,
        name: paso.name,
        season: paso.season,
      },
      trabajadoras: pools,
      tramos: tramosPantalla,
      boquillas,
      avisos: avisosDeCoherencia(tramosPantalla),
    };
  } catch (error) {
    console.error("No se ha podido cargar el apartado de tramos", error);
    return (
      <EmptyState
        title="No se ha podido cargar los tramos"
        description="Ha habido un problema al leer los datos."
        action={<BotonReintentar />}
      />
    );
  }

  return <PantallaTramos {...datos} />;
}

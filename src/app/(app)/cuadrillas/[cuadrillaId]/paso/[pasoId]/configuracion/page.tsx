import { BotonReintentar } from "@/components/features/configuracion/BotonReintentar";
import { CrearPaso } from "@/components/features/configuracion/CrearPaso";
import { WizardPaso } from "@/components/features/configuracion/WizardPaso";
import type {
  DatosCostalero,
  DatosPaso,
  DatosTramo,
  DatosTrabajadora,
} from "@/components/features/configuracion/tipos";
import { EmptyState } from "@/components/ui/EmptyState";
import { crearRepositorioAsignaciones } from "@/server/repos/asignaciones";
import { crearRepositorioCostaleros } from "@/server/repos/costaleros";
import { crearRepositorioPasos } from "@/server/repos/pasos";
import { crearRepositorioTrabajaderas } from "@/server/repos/trabajaderas";
import { crearRepositorioTramos } from "@/server/repos/tramos";
import { createServerSupabaseClient } from "@/server/supabase/server";

/** Valor de `pasoId` que abre el alta de un paso nuevo. */
const PASO_NUEVO = "nuevo";

/**
 * P3 — Wizard de creación del paso (§9).
 *
 * Lee el paso con sus trabajaderas, sus pools, sus tramos y los
 * costaleros de la cuadrilla, y se lo pasa al wizard. Los permisos los
 * decide RLS: si el capataz no es el dueño, no ve nada y la pantalla lo
 * explica.
 */
export default async function PageConfiguracion({
  params,
}: {
  params: Promise<{ cuadrillaId: string; pasoId: string }>;
}) {
  const { cuadrillaId, pasoId } = await params;

  if (pasoId === PASO_NUEVO) {
    return <CrearPaso cuadrillaId={cuadrillaId} />;
  }

  let datos: {
    paso: DatosPaso;
    trabajaderas: DatosTrabajadora[];
    tramos: DatosTramo[];
    costaleros: DatosCostalero[];
    boquillas: string[];
  };

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
          description="No tienes permiso para configurarlo."
        />
      );
    }

    const trabajaderas = crearRepositorioTrabajaderas(cliente);
    const asignaciones = crearRepositorioAsignaciones(cliente);
    const tramos = crearRepositorioTramos(cliente);
    const costaleros = crearRepositorioCostaleros(cliente);

    const listaTrabajadoras = await trabajaderas.listarPorPaso(pasoId);
    const listaCostaleros = await costaleros.listarPorCuadrilla(
      paso.cuadrilla_id,
      { active: true },
    );
    const listaTramos = await tramos.listarPorPaso(pasoId);

    const nombrePorCostalero = new Map(
      listaCostaleros.data.map((costalero) => [
        costalero.id,
        costalero.full_name,
      ]),
    );
    const costalerosDeLaCuadrilla: DatosCostalero[] = listaCostaleros.data.map(
      (costalero) => ({
        id: costalero.id,
        full_name: costalero.full_name,
        nickname: costalero.nickname,
      }),
    );

    const pools = new Map<string, string[]>();
    const boquillas: string[] = [];
    for (const trabajadera of listaTrabajadoras.data) {
      const asignadas = await asignaciones.listarPorTrabajadera(trabajadera.id);
      const ids = asignadas.data.map((asignacion) => asignacion.costalero_id);
      ids.sort((a, b) =>
        (nombrePorCostalero.get(a) ?? "").localeCompare(
          nombrePorCostalero.get(b) ?? "",
          "es",
        ),
      );
      pools.set(trabajadera.id, ids);
      for (const asignacion of asignadas.data) {
        if (asignacion.is_boquilla) boquillas.push(asignacion.costalero_id);
      }
    }

    datos = {
      paso: {
        id: paso.id,
        cuadrilla_id: paso.cuadrilla_id,
        name: paso.name,
        season: paso.season,
        num_trabajaderas: paso.num_trabajaderas,
      },
      trabajaderas: listaTrabajadoras.data.map((trabajadera) => ({
        id: trabajadera.id,
        position: trabajadera.position,
        carga: trabajadera.carga,
        pool: pools.get(trabajadera.id) ?? [],
      })),
      tramos: listaTramos.data.map((tramo) => ({
        id: tramo.id,
        name: tramo.name,
        ordinal: tramo.ordinal,
        kind: tramo.kind,
      })),
      costaleros: costalerosDeLaCuadrilla,
      boquillas,
    };
  } catch (error) {
    console.error("No se ha podido cargar la configuración del paso", error);
    return (
      <EmptyState
        title="No se ha podido cargar el paso"
        description="Ha habido un problema al leer los datos."
        action={<BotonReintentar />}
      />
    );
  }

  const version = JSON.stringify(datos);

  return (
    <WizardPaso
      paso={datos.paso}
      cuadrillaId={cuadrillaId}
      trabajaderas={datos.trabajaderas}
      tramos={datos.tramos}
      costaleros={datos.costaleros}
      boquillas={datos.boquillas}
      version={version}
    />
  );
}

/**
 * Ayudas compartidas por los tests del dominio.
 *
 * Construyen entradas y planes de forma explícita, para que cada test escriba a mano
 * el reparto que quiere comprobar (sin depender del solver).
 */

import type {
  EstadoCostoalero,
  RelevoPlan,
  RelevoPlanInput,
  TramoEntrada,
  TrabajaderaEntrada,
} from "../modelo";

/** Opciones para construir una entrada del solver. */
export type OpcionesEntrada = {
  pasoId?: string;
  trabajaderas?: TrabajaderaEntrada[];
  tramos?: TramoEntrada[];
  boquillas?: string[];
};

/**
 * Crea los tramos de un recorrido: el primero es `salida`, el último es `entrada` y los
 * intermedios son `normal` (§8.3).
 */
export function crearTramos(cantidad: number): TramoEntrada[] {
  return Array.from({ length: cantidad }, (_, indice) => {
    const ordinal = indice + 1;
    const kind =
      ordinal === 1 ? "salida" : ordinal === cantidad ? "entrada" : "normal";
    return { id: `tr${ordinal}`, name: `Tramo ${ordinal}`, ordinal, kind };
  });
}

/** Crea una entrada del solver con los valores por defecto de los tests. */
export function crearEntrada(overrides: OpcionesEntrada = {}): RelevoPlanInput {
  return {
    pasoId: overrides.pasoId ?? "paso-1",
    trabajaderas: overrides.trabajaderas ?? [
      {
        id: "t1",
        position: 1,
        carga: 5,
        pool: ["c1", "c2", "c3", "c4", "c5", "c6"],
      },
    ],
    tramos: overrides.tramos ?? crearTramos(4),
    boquillas: overrides.boquillas ?? ["c1", "c2"],
  };
}

/**
 * Descansos por tramo y trabajadera: `descansos[tramoId][trabajaderaId]` = costaleros
 * que descansan en ese tramo de esa trabajadera.
 */
export type DescansosPorTramo = Record<string, Record<string, string[]>>;

/**
 * Construye un plan a partir de los descansos declarados por tramo y trabajadera.
 * Los costaleros que no descansan quedan `en_paso`.
 */
export function crearPlanDesdeDescansos(
  entrada: RelevoPlanInput,
  descansos: DescansosPorTramo,
): RelevoPlan {
  const estados: Record<string, Record<string, EstadoCostoalero>> = {};
  const porTrabajadera: RelevoPlan["porTrabajadera"] = {};

  for (const tramo of entrada.tramos) {
    const porTramo = descansos[tramo.id] ?? {};
    const estadosTramo: Record<string, EstadoCostoalero> = {};
    const declaracion: Record<
      string,
      { enPaso: string[]; descansan: string[] }
    > = {};

    for (const trabajadera of entrada.trabajaderas) {
      const descansan = porTramo[trabajadera.id] ?? [];
      const enPaso = trabajadera.pool.filter(
        (costalero) => !descansan.includes(costalero),
      );
      for (const costalero of trabajadera.pool) {
        estadosTramo[costalero] = descansan.includes(costalero)
          ? "descanso"
          : "en_paso";
      }
      declaracion[trabajadera.id] = { enPaso, descansan };
    }

    estados[tramo.id] = estadosTramo;
    porTrabajadera[tramo.id] = declaracion;
  }

  return {
    pasoId: entrada.pasoId,
    seed: 1,
    solverVersion: "test",
    estados,
    porTrabajadera,
  };
}

/** Copia profunda de un plan, para mutarlo sin tocar el original. */
export function clonarPlan(plan: RelevoPlan): RelevoPlan {
  return JSON.parse(JSON.stringify(plan)) as RelevoPlan;
}

/** Estado de un costalero en un tramo, o `undefined` si el plan no lo dice. */
export function estadoDe(
  plan: RelevoPlan,
  tramoId: string,
  costalero: string,
): EstadoCostoalero | undefined {
  return plan.estados[tramoId]?.[costalero];
}

/** Cambia el estado de un costalero en un tramo. */
export function cambiarEstado(
  plan: RelevoPlan,
  tramoId: string,
  costalero: string,
  estado: EstadoCostoalero,
): void {
  const estadosTramo = plan.estados[tramoId];
  if (!estadosTramo) return;
  estadosTramo[costalero] = estado;
}

/** Sustituye la lista de los que van en el paso en un tramo de una trabajadera. */
export function cambiarEnPaso(
  plan: RelevoPlan,
  tramoId: string,
  trabajaderaId: string,
  enPaso: string[],
): void {
  const porTramo = plan.porTrabajadera[tramoId];
  const declaracion = porTramo?.[trabajaderaId];
  if (!declaracion) return;
  declaracion.enPaso = enPaso;
}

/** Sustituye la lista de los que descansan en un tramo de una trabajadera. */
export function cambiarDescansan(
  plan: RelevoPlan,
  tramoId: string,
  trabajaderaId: string,
  descansan: string[],
): void {
  const porTramo = plan.porTrabajadera[tramoId];
  const declaracion = porTramo?.[trabajaderaId];
  if (!declaracion) return;
  declaracion.descansan = descansan;
}

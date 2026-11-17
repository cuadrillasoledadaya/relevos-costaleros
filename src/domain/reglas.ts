/**
 * Predicados puros de las reglas del relevo (§8) y cálculo de la equidad EQ.
 *
 * Las únicas reglas del dominio son R1, R2, R3, R4, R5 y el objetivo EQ (§8, OP-2).
 * Ninguna función de este módulo añade, relaja ni reinterpreta una regla: se limitan a
 * comprobar el enunciado de §8.1 sobre un plan y una entrada.
 */

import { DESCANSOS_MINIMOS_POR_COSTALERO } from "./glosario";
import type {
  EstadoCostoalero,
  PlanStats,
  RelevoPlan,
  RelevoPlanInput,
  TramoEntrada,
} from "./modelo";

/** Vista normalizada del plan: todo se recalcula a partir del plan y de la entrada. */
type VistaPlan = {
  /** Tramos ordenados por `ordinal`: el orden del recorrido. */
  tramos: TramoEntrada[];
  /** Costaleros del paso: unión de los pools, sin repetir (supuesto S-7). */
  personas: string[];
  /** Persona → índice global. */
  indicePersona: Map<string, number>;
  /** Estado de cada persona en cada tramo, leído de `plan.estados`. */
  estadoPorTramo: Map<string, Map<string, EstadoCostoalero>>;
  /** Tramo de salida (§8.3: el primero del recorrido). */
  salidaId: string | null;
  /** Tramo de entrada (§8.3: el último del recorrido). */
  entradaId: string | null;
};

/**
 * Normaliza el plan y la entrada: orden de los tramos, costaleros del paso y estados.
 * Es la única lectura del plan que usan las reglas, para que todas miren lo mismo.
 */
function construirVista(plan: RelevoPlan, input: RelevoPlanInput): VistaPlan {
  const tramos = [...input.tramos].sort((a, b) => a.ordinal - b.ordinal);

  const personas: string[] = [];
  const indicePersona = new Map<string, number>();
  const personasVistas = new Set<string>();
  for (const trabajadera of [...input.trabajaderas].sort(
    (a, b) => a.position - b.position,
  )) {
    for (const costalero of trabajadera.pool) {
      if (personasVistas.has(costalero)) continue;
      personasVistas.add(costalero);
      indicePersona.set(costalero, personas.length);
      personas.push(costalero);
    }
  }

  const estadoPorTramo = new Map<string, Map<string, EstadoCostoalero>>();
  for (const tramo of tramos) {
    const estados = plan.estados[tramo.id] ?? {};
    estadoPorTramo.set(tramo.id, new Map(Object.entries(estados)));
  }

  const salida =
    tramos.find((tramo) => tramo.kind === "salida") ?? tramos[0] ?? null;
  const entrada =
    [...tramos].reverse().find((tramo) => tramo.kind === "entrada") ??
    tramos[tramos.length - 1] ??
    null;

  return {
    tramos,
    personas,
    indicePersona,
    estadoPorTramo,
    salidaId: salida?.id ?? null,
    entradaId: entrada?.id ?? null,
  };
}

/** Estado de una persona en un tramo: `undefined` si el plan no dice nada de ella. */
function estadoEn(
  vista: VistaPlan,
  tramoId: string,
  costalero: string,
): EstadoCostoalero | undefined {
  return vista.estadoPorTramo.get(tramoId)?.get(costalero);
}

/**
 * R1 — "los costaleros de la primera trabadera solo podran cambiarse en los relevos de
 * los tramos por compañeros de su misma trabajadera siempre eso es incambiable".
 *
 * Comprobación (§8.1): en toda trabajadera `t` y todo tramo `k`, el conjunto de costaleros
 * `en_paso` y el de `descanso` son ambos subconjuntos de `pool(t)`. Nadie de otra
 * trabajadera puede entrar. Por el supuesto S-2 el criterio se aplica a todas las
 * trabajaderas.
 *
 * Se comprueba además que el reparto declarado en `porTrabajadera` es coherente con
 * `estados` y con el modelo de §7.2 (exactamente `carga` en el paso y `r = pool - carga`
 * descansando), porque un plan que no lo cumple no describe un relevo válido.
 */
export function checkR1(plan: RelevoPlan, input: RelevoPlanInput): boolean {
  const vista = construirVista(plan, input);

  // Nadie que no sea costalero del paso puede aparecer en el plan.
  for (const estados of vista.estadoPorTramo.values()) {
    for (const costalero of estados.keys()) {
      if (!vista.indicePersona.has(costalero)) return false;
    }
  }

  for (const tramo of vista.tramos) {
    const declarados = plan.porTrabajadera[tramo.id];
    if (!declarados) return false;

    for (const trabajadera of input.trabajaderas) {
      const declaracion = declarados[trabajadera.id];
      if (!declaracion) return false;

      const enPaso = new Set(declaracion.enPaso);
      const descansan = new Set(declaracion.descansan);

      // (R1) Subconjuntos del pool de la trabajadera.
      for (const costalero of enPaso) {
        if (!trabajadera.pool.includes(costalero)) return false;
      }
      for (const costalero of descansan) {
        if (!trabajadera.pool.includes(costalero)) return false;
      }

      // El pool entero está repartido entre `en_paso` y `descanso`, sin repeticiones.
      if (
        enPaso.size + descansan.size !==
        new Set([...enPaso, ...descansan]).size
      )
        return false;
      if (enPaso.size + descansan.size !== trabajadera.pool.length)
        return false;

      // Modelo de §7.2: exactamente `carga` en el paso y `r = pool - carga` descansando.
      if (enPaso.size !== trabajadera.carga) return false;
      if (descansan.size !== trabajadera.pool.length - trabajadera.carga)
        return false;

      // Coherencia entre `porTrabajadera` y `estados`.
      for (const costalero of trabajadera.pool) {
        const estado = estadoEn(vista, tramo.id, costalero);
        if (estado === undefined) return false;
        if (descansan.has(costalero) !== (estado === "descanso")) return false;
        if (enPaso.has(costalero) !== (estado === "en_paso")) return false;
      }
    }
  }

  return true;
}

/**
 * R2 — "todos los costaleros deben salir al menos dos veces durante el recorrido".
 *
 * Comprobación (§8.1): para todo costalero `c` del paso, `Σ_k [desc(c,k)] ≥ 2`.
 */
export function checkR2(plan: RelevoPlan, input: RelevoPlanInput): boolean {
  const vista = construirVista(plan, input);

  for (const costalero of vista.personas) {
    let descansos = 0;
    for (const tramo of vista.tramos) {
      if (estadoEn(vista, tramo.id, costalero) === "descanso") descansos++;
    }
    if (descansos < DESCANSOS_MINIMOS_POR_COSTALERO) return false;
  }

  return true;
}

/**
 * R3 — "los costaleros no deben estar fuera dos relevos seguidos".
 *
 * Comprobación (§8.1): para todo costalero `c` y todo tramo `k`, `¬(desc(c,k) ∧ desc(c,k+1))`.
 * Los tramos consecutivos son los consecutivos en el recorrido (orden por `ordinal`).
 */
export function checkR3(plan: RelevoPlan, input: RelevoPlanInput): boolean {
  const vista = construirVista(plan, input);

  for (let i = 0; i + 1 < vista.tramos.length; i++) {
    const actual = vista.tramos[i];
    const siguiente = vista.tramos[i + 1];
    if (!actual || !siguiente) continue;
    for (const costalero of vista.personas) {
      if (
        estadoEn(vista, actual.id, costalero) === "descanso" &&
        estadoEn(vista, siguiente.id, costalero) === "descanso"
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * R4 — "los dos boquillas no deben coincidir fuera del paso los dos a la vez".
 *
 * Comprobación (§8.1): para todo tramo `k`, `¬(desc(b1,k) ∧ desc(b2,k))`.
 * Si el paso no tiene 2 boquillas distintas la regla no es evaluable y se considera
 * incumplida (la precondición F-5 es la que lo detecta con su mensaje).
 */
export function checkR4(plan: RelevoPlan, input: RelevoPlanInput): boolean {
  const vista = construirVista(plan, input);

  const boquilla1 = input.boquillas[0];
  const boquilla2 = input.boquillas[1];
  if (!boquilla1 || !boquilla2 || boquilla1 === boquilla2) return false;

  for (const tramo of vista.tramos) {
    if (
      estadoEn(vista, tramo.id, boquilla1) === "descanso" &&
      estadoEn(vista, tramo.id, boquilla2) === "descanso"
    ) {
      return false;
    }
  }

  return true;
}

/**
 * R5 — "los costaleros que hagan la salida no deben hacer la entrada dentro de lo posible".
 *
 * Comprobación (§8.1): se mide `|enPaso(·, salida) ∩ enPaso(·, entrada)|`, el solapamiento
 * entre quienes van en el paso en el primer tramo y en el último (§8.3).
 *
 * `maximo` es el mejor valor posible: la cota inferior por principio del palomar sumada
 * por trabajadera (`max(0, 2·carga - pool)`), que ningún plan puede bajar.
 */
export function checkR5(
  plan: RelevoPlan,
  input: RelevoPlanInput,
): { valor: number; maximo: number } {
  const vista = construirVista(plan, input);

  const enPasoSalida = new Set<string>();
  const enPasoEntrada = new Set<string>();

  if (vista.salidaId) {
    for (const costalero of vista.personas) {
      if (estadoEn(vista, vista.salidaId, costalero) === "en_paso")
        enPasoSalida.add(costalero);
    }
  }
  if (vista.entradaId) {
    for (const costalero of vista.personas) {
      if (estadoEn(vista, vista.entradaId, costalero) === "en_paso")
        enPasoEntrada.add(costalero);
    }
  }

  let valor = 0;
  for (const costalero of enPasoSalida) {
    if (enPasoEntrada.has(costalero)) valor++;
  }

  let maximo = 0;
  for (const trabajadera of input.trabajaderas) {
    maximo += Math.max(0, 2 * trabajadera.carga - trabajadera.pool.length);
  }

  return { valor, maximo };
}

/**
 * EQ — dispersión de descansos: `max - min` dentro de cada pool y entre costaleros del
 * paso (§8.1, §8.2).
 */
export function calcularDispersion(
  plan: RelevoPlan,
  input: RelevoPlanInput,
): { porTrabajadera: Record<string, number>; global: number } {
  const vista = construirVista(plan, input);

  const descansosPorPersona = new Map<string, number>();
  for (const costalero of vista.personas) {
    let descansos = 0;
    for (const tramo of vista.tramos) {
      if (estadoEn(vista, tramo.id, costalero) === "descanso") descansos++;
    }
    descansosPorPersona.set(costalero, descansos);
  }

  const porTrabajadera: Record<string, number> = {};
  for (const trabajadera of input.trabajaderas) {
    let maximo = 0;
    let minimo = Number.POSITIVE_INFINITY;
    for (const costalero of trabajadera.pool) {
      const descansos = descansosPorPersona.get(costalero) ?? 0;
      if (descansos > maximo) maximo = descansos;
      if (descansos < minimo) minimo = descansos;
    }
    porTrabajadera[trabajadera.id] = Number.isFinite(minimo)
      ? maximo - minimo
      : 0;
  }

  let maximoGlobal = 0;
  let minimoGlobal = Number.POSITIVE_INFINITY;
  for (const descansos of descansosPorPersona.values()) {
    if (descansos > maximoGlobal) maximoGlobal = descansos;
    if (descansos < minimoGlobal) minimoGlobal = descansos;
  }

  return {
    porTrabajadera,
    global: Number.isFinite(minimoGlobal) ? maximoGlobal - minimoGlobal : 0,
  };
}

/**
 * Estadísticas completas del plan y cumplimiento de R1..R5 (§11.1).
 * Es la función que usa `verificarPlan` para re-evaluar el plan producido.
 */
export function calcularEstadisticas(
  plan: RelevoPlan,
  input: RelevoPlanInput,
): PlanStats {
  const vista = construirVista(plan, input);

  const descansosPorCostalero: Record<string, number> = {};
  for (const costalero of vista.personas) {
    let descansos = 0;
    for (const tramo of vista.tramos) {
      if (estadoEn(vista, tramo.id, costalero) === "descanso") descansos++;
    }
    descansosPorCostalero[costalero] = descansos;
  }

  const descansosPorTrabajadera: Record<string, Record<string, number>> = {};
  for (const trabajadera of input.trabajaderas) {
    const porCostalero: Record<string, number> = {};
    for (const costalero of trabajadera.pool) {
      porCostalero[costalero] = descansosPorCostalero[costalero] ?? 0;
    }
    descansosPorTrabajadera[trabajadera.id] = porCostalero;
  }

  const dispersion = calcularDispersion(plan, input);
  const r5 = checkR5(plan, input);

  return {
    descansosPorCostalero,
    descansosPorTrabajadera,
    dispercionPorTrabajadera: dispersion.porTrabajadera,
    dispercionGlobal: dispersion.global,
    solapamientoSalidaEntrada: r5.valor,
    cumplimiento: {
      r1: checkR1(plan, input),
      r2: checkR2(plan, input),
      r3: checkR3(plan, input),
      r4: checkR4(plan, input),
      r5: { valor: r5.valor, maximo: r5.maximo },
    },
  };
}

/**
 * `true` si el plan cumple las cuatro reglas duras R1..R4 (§8.2, paso 1).
 * Es la condición que la app usa para no mostrar nunca un plan inválido (X-10).
 */
export function esPlanValido(
  plan: RelevoPlan,
  input: RelevoPlanInput,
): boolean {
  return (
    checkR1(plan, input) &&
    checkR2(plan, input) &&
    checkR3(plan, input) &&
    checkR4(plan, input)
  );
}

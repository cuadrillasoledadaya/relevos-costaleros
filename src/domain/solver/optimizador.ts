/**
 * Fase B del solver (§11.2): optimización local de la solución factible con *simulated
 * annealing*.
 *
 * Movimiento: en un tramo y una trabajadera se intercambia a quien descansa por quien va
 * en el paso, respetando R3 y R4. El coste es el de §8.2: primero la dispersión dentro de
 * cada pool, después la dispersión global y por último el solapamiento salida/entrada
 * (R5).
 */

import { DESCANSOS_MINIMOS_POR_COSTALERO } from "../glosario";
import type { ContextoSolver, RepartoDescansos } from "./busqueda";
import type { PRNG } from "./prng";

/** Pesos del coste, en el orden de prioridad de §8.2. */
export const PESOS_COSTE = {
  /** Dispersión de descansos dentro de cada pool (EQ, §8.2 punto 2). */
  dispersionPorTrabajadera: 1000,
  /** Dispersión de descansos entre costaleros del paso (EQ global, §8.2 punto 3). */
  dispersionGlobal: 100,
  /** Solapamiento entre los que hacen la salida y los que hacen la entrada (R5, §8.2 punto 4). */
  solapamientoSalidaEntrada: 10,
} as const;

/** Reparto final: `descansoPorTrabajadera[trabajadera][tramo]` = índices de persona. */
export type RepartoIndices = number[][][];

/** Resultado de la fase de optimización. */
export type ResultadoOptimizador = {
  descansoPorTrabajadera: RepartoIndices;
  coste: number;
};

/** Celda de un tramo: quién descansa y quién va en el paso, con índices para O(1). */
type Celda = {
  descansan: number[];
  indiceDescansan: Map<number, number>;
  enPaso: number[];
  indiceEnPaso: Map<number, number>;
};

/** Temperatura inicial y final del *annealing* (en unidades de coste). */
const TEMPERATURA_INICIAL = 1000;
const TEMPERATURA_FINAL = 1;
/** Número de escalones de la temperatura: el enfriamiento es lineal y determinista. */
const ESCALONES_TEMPERATURA = 256;

/** Temperatura en la iteración `iteracion` (enfriamiento lineal por escalones). */
function temperaturaEn(iteracion: number, iteraciones: number): number {
  const total = Math.max(1, iteraciones);
  const escalon = Math.min(
    ESCALONES_TEMPERATURA,
    Math.floor((iteracion * ESCALONES_TEMPERATURA) / total),
  );
  const progreso = escalon / ESCALONES_TEMPERATURA;
  return (
    TEMPERATURA_INICIAL + (TEMPERATURA_FINAL - TEMPERATURA_INICIAL) * progreso
  );
}

/** Quita a una persona del conjunto de descansantes (swap-remove). */
function quitarDeDescansan(celda: Celda, persona: number): void {
  const posicion = celda.indiceDescansan.get(persona);
  if (posicion === undefined) return;
  const ultimo = celda.descansan.length - 1;
  const ultimoElemento = celda.descansan[ultimo];
  if (posicion !== ultimo && ultimoElemento !== undefined) {
    celda.descansan[posicion] = ultimoElemento;
    celda.indiceDescansan.set(ultimoElemento, posicion);
  }
  celda.descansan.pop();
  celda.indiceDescansan.delete(persona);
}

/** Quita a una persona del conjunto de los que van en el paso (swap-remove). */
function quitarDePaso(celda: Celda, persona: number): void {
  const posicion = celda.indiceEnPaso.get(persona);
  if (posicion === undefined) return;
  const ultimo = celda.enPaso.length - 1;
  const ultimoElemento = celda.enPaso[ultimo];
  if (posicion !== ultimo && ultimoElemento !== undefined) {
    celda.enPaso[posicion] = ultimoElemento;
    celda.indiceEnPaso.set(ultimoElemento, posicion);
  }
  celda.enPaso.pop();
  celda.indiceEnPaso.delete(persona);
}

/** Añade a una persona al conjunto de descansantes. */
function meterEnDescansan(celda: Celda, persona: number): void {
  celda.indiceDescansan.set(persona, celda.descansan.length);
  celda.descansan.push(persona);
}

/** Añade a una persona al conjunto de los que van en el paso. */
function meterEnPaso(celda: Celda, persona: number): void {
  celda.indiceEnPaso.set(persona, celda.enPaso.length);
  celda.enPaso.push(persona);
}

/**
 * Fase B: optimiza un reparto factible para minimizar el coste de §8.2.
 * Devuelve siempre un reparto válido: el mejor encontrado no puede ser peor que el inicial.
 */
export function optimizar(
  contexto: ContextoSolver,
  repartoInicial: RepartoDescansos,
  prng: PRNG,
  maxIteraciones: number,
): ResultadoOptimizador {
  const totalTramos = contexto.totalTramos;
  const numTrabajaderas = contexto.trabajaderas.length;

  // Cada tramo con sus descansantes y el resto en el paso.
  const celdas: Celda[][] = contexto.trabajaderas.map((trabajadera, indice) => {
    const pool = contexto.poolPorTrabajadera[indice] ?? [];
    return Array.from({ length: totalTramos }, () => {
      const celda: Celda = {
        descansan: [],
        indiceDescansan: new Map(),
        enPaso: [],
        indiceEnPaso: new Map(),
      };
      for (const persona of pool) {
        meterEnPaso(celda, persona);
      }
      return celda;
    });
  });

  for (let indice = 0; indice < numTrabajaderas; indice++) {
    for (let tramo = 0; tramo < totalTramos; tramo++) {
      const celda = celdas[indice]?.[tramo];
      const descansan = repartoInicial[indice]?.[tramo];
      if (!celda || !descansan) continue;
      for (const persona of descansan) {
        quitarDePaso(celda, persona);
        meterEnDescansan(celda, persona);
      }
    }
  }

  const descansos = new Int32Array(contexto.personas.length);
  for (const fila of celdas) {
    for (const celda of fila) {
      for (const persona of celda.descansan) {
        descansos[persona] = (descansos[persona] ?? 0) + 1;
      }
    }
  }

  const maxDescansos = Math.max(1, contexto.maxDescansosPorPersona + 1);
  const histograma = new Int32Array(maxDescansos + 2);
  for (let i = 0; i < descansos.length; i++) {
    const cuenta = descansos[i] ?? 0;
    histograma[cuenta] = (histograma[cuenta] ?? 0) + 1;
  }

  const dispersionLocal = (indice: number): number => {
    const pool = contexto.poolPorTrabajadera[indice] ?? [];
    let maximo = 0;
    let minimo = Number.POSITIVE_INFINITY;
    for (const persona of pool) {
      const cuenta = descansos[persona] ?? 0;
      if (cuenta > maximo) maximo = cuenta;
      if (cuenta < minimo) minimo = cuenta;
    }
    return Number.isFinite(minimo) ? maximo - minimo : 0;
  };

  const dispersionGlobal = (): number => {
    let maximo = -1;
    let minimo = -1;
    for (let cuenta = 0; cuenta < histograma.length; cuenta++) {
      if ((histograma[cuenta] ?? 0) <= 0) continue;
      if (minimo < 0) minimo = cuenta;
      maximo = cuenta;
    }
    if (minimo < 0 || maximo < 0) return 0;
    return maximo - minimo;
  };

  const solapamientoDe = (indice: number): number => {
    const celdaSalida = celdas[indice]?.[contexto.indiceSalida];
    const celdaEntrada = celdas[indice]?.[contexto.indiceEntrada];
    if (!celdaSalida || !celdaEntrada) return 0;
    let solapamiento = 0;
    for (const persona of celdaSalida.enPaso) {
      if (celdaEntrada.indiceEnPaso.has(persona)) solapamiento++;
    }
    return solapamiento;
  };

  /** Aplica el intercambio: `a` sale del descanso y `b` entra. */
  const intercambiar = (celda: Celda, a: number, b: number): void => {
    quitarDeDescansan(celda, a);
    meterEnPaso(celda, a);
    quitarDePaso(celda, b);
    meterEnDescansan(celda, b);
    const cuentaA = descansos[a] ?? 0;
    const cuentaB = descansos[b] ?? 0;
    descansos[a] = cuentaA - 1;
    descansos[b] = cuentaB + 1;
    histograma[cuentaA] = (histograma[cuentaA] ?? 0) - 1;
    histograma[cuentaA - 1] = (histograma[cuentaA - 1] ?? 0) + 1;
    histograma[cuentaB] = (histograma[cuentaB] ?? 0) - 1;
    histograma[cuentaB + 1] = (histograma[cuentaB + 1] ?? 0) + 1;
  };

  /** El movimiento es válido si no rompe R2, R3 ni R4. */
  const movimientoValido = (
    indice: number,
    tramo: number,
    a: number,
    b: number,
  ): boolean => {
    // R2: quien deja el descanso debe conservar al menos 2 descansos.
    if ((descansos[a] ?? 0) - 1 < DESCANSOS_MINIMOS_POR_COSTALERO) return false;

    // R3: quien entra no puede descansar en el tramo anterior ni en el siguiente.
    if (tramo > 0) {
      const anterior = celdas[indice]?.[tramo - 1];
      if (anterior && anterior.indiceDescansan.has(b)) return false;
    }
    if (tramo + 1 < totalTramos) {
      const siguiente = celdas[indice]?.[tramo + 1];
      if (siguiente && siguiente.indiceDescansan.has(b)) return false;
    }

    // R4: si entra una boquilla, la otra no puede estar descansando en ese tramo.
    const boquilla = contexto.indiceBoquilla[b] ?? -1;
    if (boquilla >= 0) {
      const otraId = contexto.boquillas[1 - boquilla];
      const idA = contexto.personas[a];
      if (otraId !== undefined && otraId !== idA) {
        const indiceOtra = contexto.indicePersona.get(otraId);
        const trabajaderaOtra =
          indiceOtra === undefined
            ? -1
            : (contexto.indiceTrabajaderaDePersona.get(otraId) ?? -1);
        if (indiceOtra !== undefined && trabajaderaOtra >= 0) {
          const celdaOtra = celdas[trabajaderaOtra]?.[tramo];
          if (celdaOtra && celdaOtra.indiceDescansan.has(indiceOtra))
            return false;
        }
      }
    }

    return true;
  };

  const volcarReparto = (): RepartoIndices => {
    return celdas.map((fila) => fila.map((celda) => [...celda.descansan]));
  };

  const dispersionPorTrabajadera = contexto.trabajaderas.map((_, indice) =>
    dispersionLocal(indice),
  );
  const solapamientoPorTrabajadera = contexto.trabajaderas.map((_, indice) =>
    solapamientoDe(indice),
  );
  let dispersionGlobalActual = dispersionGlobal();

  /**
   * Mejor coste posible: dispersión 0 en todos los pools y en el paso, y el solapamiento
   * salida/entrada en su cota inferior (principio del palomar, §8.3).
   */
  let solapamientoMaximo = 0;
  contexto.trabajaderas.forEach((trabajadera) => {
    solapamientoMaximo += Math.max(
      0,
      2 * trabajadera.carga - trabajadera.pool.length,
    );
  });

  const esOptimo = (): boolean => {
    if (dispersionGlobalActual !== 0) return false;
    for (const dispersion of dispersionPorTrabajadera) {
      if (dispersion !== 0) return false;
    }
    let solapamiento = 0;
    for (const valor of solapamientoPorTrabajadera) {
      solapamiento += valor;
    }
    return solapamiento === solapamientoMaximo;
  };

  const costeDe = (
    dispersion: number[],
    solapamiento: number[],
    dispersionGlobalValor: number,
  ): number => {
    let coste = 0;
    for (let indice = 0; indice < numTrabajaderas; indice++) {
      coste += PESOS_COSTE.dispersionPorTrabajadera * (dispersion[indice] ?? 0);
      coste +=
        PESOS_COSTE.solapamientoSalidaEntrada * (solapamiento[indice] ?? 0);
    }
    coste += PESOS_COSTE.dispersionGlobal * dispersionGlobalValor;
    return coste;
  };

  let costeTotal = costeDe(
    dispersionPorTrabajadera,
    solapamientoPorTrabajadera,
    dispersionGlobalActual,
  );
  let mejorCoste = costeTotal;
  let mejorReparto = volcarReparto();
  let iteracionesSinMejora = 0;
  const limiteSinMejora = Math.max(2000, Math.floor(maxIteraciones / 40));

  for (let iteracion = 0; iteracion < maxIteraciones; iteracion++) {
    if (iteracionesSinMejora > limiteSinMejora) break;
    if (esOptimo()) break;

    const indice = prng.entero(numTrabajaderas);
    const tramo = prng.entero(totalTramos);
    const celda = celdas[indice]?.[tramo];
    if (!celda) continue;
    if (celda.descansan.length === 0 || celda.enPaso.length === 0) continue;

    const a = celda.descansan[prng.entero(celda.descansan.length)];
    const b = celda.enPaso[prng.entero(celda.enPaso.length)];
    if (a === undefined || b === undefined) continue;
    if (!movimientoValido(indice, tramo, a, b)) continue;

    const dispersionAntes = dispersionPorTrabajadera[indice] ?? 0;
    const solapamientoAntes = solapamientoPorTrabajadera[indice] ?? 0;
    const dispersionGlobalAntes = dispersionGlobalActual;

    intercambiar(celda, a, b);

    const dispersionDespues = dispersionLocal(indice);
    const solapamientoDespues =
      tramo === contexto.indiceSalida || tramo === contexto.indiceEntrada
        ? solapamientoDe(indice)
        : solapamientoAntes;
    const dispersionGlobalDespues = dispersionGlobal();

    const delta =
      PESOS_COSTE.dispersionPorTrabajadera *
        (dispersionDespues - dispersionAntes) +
      PESOS_COSTE.solapamientoSalidaEntrada *
        (solapamientoDespues - solapamientoAntes) +
      PESOS_COSTE.dispersionGlobal *
        (dispersionGlobalDespues - dispersionGlobalAntes);

    const temperatura = temperaturaEn(iteracion, maxIteraciones);
    const acepta =
      delta <= 0 ||
      (temperatura > 0 && prng.siguiente() < Math.exp(-delta / temperatura));

    if (!acepta) {
      intercambiar(celda, b, a);
      iteracionesSinMejora++;
      continue;
    }

    dispersionPorTrabajadera[indice] = dispersionDespues;
    solapamientoPorTrabajadera[indice] = solapamientoDespues;
    dispersionGlobalActual = dispersionGlobalDespues;
    costeTotal += delta;

    if (costeTotal < mejorCoste) {
      mejorCoste = costeTotal;
      mejorReparto = volcarReparto();
      iteracionesSinMejora = 0;
    } else {
      iteracionesSinMejora++;
    }
  }

  return { descansoPorTrabajadera: mejorReparto, coste: mejorCoste };
}

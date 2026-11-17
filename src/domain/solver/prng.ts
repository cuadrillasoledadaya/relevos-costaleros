/**
 * PRNG propio y determinista (mulberry32) para el solver.
 *
 * PROHIBIDO usar `Math.random()` dentro de `src/domain/**` (X-5, requisito S-1): con la
 * misma semilla, la misma entrada y el mismo plan.
 */

/** Generador pseudoaleatorio determinista. */
export type PRNG = {
  /** Flotante en `[0, 1)`. */
  siguiente(): number;
  /** Entero en `[0, maximoExclusivo)`. */
  entero(maximoExclusivo: number): number;
  /** Elemento aleatorio de una lista, o `undefined` si la lista está vacía. */
  elegir<T>(elementos: readonly T[]): T | undefined;
  /** Copia barajada (Fisher-Yates) de la lista. */
  barajar<T>(elementos: readonly T[]): T[];
};

/**
 * Crea un PRNG determinista a partir de una semilla (mulberry32).
 * La misma semilla produce siempre la misma secuencia de números.
 */
export function crearPRNG(semilla: number): PRNG {
  let estado = semilla >>> 0;

  const siguiente = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const entero = (maximoExclusivo: number): number => {
    if (maximoExclusivo <= 0) return 0;
    const valor = Math.floor(siguiente() * maximoExclusivo);
    return valor >= maximoExclusivo ? maximoExclusivo - 1 : valor;
  };

  const elegir = <T>(elementos: readonly T[]): T | undefined => {
    if (elementos.length === 0) return undefined;
    return elementos[entero(elementos.length)];
  };

  const barajar = <T>(elementos: readonly T[]): T[] => {
    const copia = [...elementos];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = entero(i + 1);
      const auxiliar = copia[i];
      const destino = copia[j];
      if (auxiliar === undefined || destino === undefined) continue;
      copia[i] = destino;
      copia[j] = auxiliar;
    }
    return copia;
  };

  return { siguiente, entero, elegir, barajar };
}

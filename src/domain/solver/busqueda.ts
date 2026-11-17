/**
 * Fase A del solver (§11.2): búsqueda con backtracking y propagación para encontrar un
 * plan que satisfaga R1..R4.
 *
 * Podas implementadas (§11.2):
 *  (a) se excluye del dominio a quien descansó en el tramo anterior (R3) y a quien ya no
 *      puede descansar más veces sin violar R3;
 *  (b) capacidad de descanso restante por costalero;
 *  (c) R4 (las 2 boquillas no simultáneas) como filtro de dominio antes de ramificar;
 *  (d) simetría: dos costaleros equivalentes del mismo pool se ordenan canónicamente;
 *  (e) se poda por F-3 (capacidad con consecutivos).
 */

import { DESCANSOS_MINIMOS_POR_COSTALERO } from "../glosario";
import type {
  RelevoPlanInput,
  TramoEntrada,
  TrabajaderaEntrada,
} from "../modelo";
import type { PRNG } from "./prng";

/** Contexto normalizado de la entrada, compartido por las dos fases del solver. */
export type ContextoSolver = {
  pasoId: string;
  /** Tramos del recorrido ordenados por `ordinal`. */
  tramos: TramoEntrada[];
  totalTramos: number;
  /** Costaleros del paso (unión de los pools, sin repetir). */
  personas: string[];
  indicePersona: Map<string, number>;
  /** Trabajaderas ordenadas por `position`. */
  trabajaderas: TrabajaderaEntrada[];
  /** Índices de persona de cada pool, en el orden del pool. */
  poolPorTrabajadera: number[][];
  cargaPorTrabajadera: number[];
  /** `r = pool - carga` de cada trabajadera (supuesto S-1). */
  rPorTrabajadera: number[];
  /** Las 2 boquillas del paso, en el orden de la entrada. */
  boquillas: string[];
  /** Índice de la boquilla (0 o 1) de cada persona; `-1` si no es boquilla. */
  indiceBoquilla: Int32Array;
  /** Índice de la trabajadera de cada persona. */
  indiceTrabajaderaDePersona: Map<string, number>;
  /** Máximo de descansos que admite una persona sin violar R3: `ceil(T / 2)`. */
  maxDescansosPorPersona: number;
  /** Índice del tramo de salida y del tramo de entrada (§8.3). */
  indiceSalida: number;
  indiceEntrada: number;
};

/** Reparto de descansos: `reparto[trabajadera][tramo]` = índices de persona que descansan. */
export type RepartoDescansos = Set<number>[][];

/** Resultado de la fase de satisfacción. */
export type ResultadoBusqueda =
  { ok: true; reparto: RepartoDescansos } | { ok: false; agotado: boolean };

/** Presupuesto de nodos de la búsqueda: cota de seguridad para no colgarse. */
export const MAX_NODOS_BUSQUEDA = 2_000_000;

/** Normaliza la entrada: orden de tramos y de trabajaderas, índices de persona, boquillas. */
export function crearContexto(input: RelevoPlanInput): ContextoSolver {
  const tramos = [...input.tramos].sort((a, b) => a.ordinal - b.ordinal);
  const trabajaderas = [...input.trabajaderas].sort(
    (a, b) => a.position - b.position,
  );

  const personas: string[] = [];
  const indicePersona = new Map<string, number>();
  const indiceTrabajaderaDePersona = new Map<string, number>();
  const poolPorTrabajadera: number[][] = [];

  trabajaderas.forEach((trabajadera, indice) => {
    const pool: number[] = [];
    for (const costalero of trabajadera.pool) {
      let indiceCos = indicePersona.get(costalero);
      if (indiceCos === undefined) {
        indiceCos = personas.length;
        indicePersona.set(costalero, indiceCos);
        personas.push(costalero);
        indiceTrabajaderaDePersona.set(costalero, indice);
      }
      pool.push(indiceCos);
    }
    poolPorTrabajadera.push(pool);
  });

  const indiceBoquilla = new Int32Array(personas.length).fill(-1);
  input.boquillas.forEach((boquilla, posicion) => {
    const indice = indicePersona.get(boquilla);
    if (indice !== undefined && posicion < 2) indiceBoquilla[indice] = posicion;
  });

  const totalTramos = tramos.length;
  const indiceSalida = tramos.findIndex((tramo) => tramo.kind === "salida");
  const entradas = tramos
    .map((tramo, indice) => ({ kind: tramo.kind, indice }))
    .filter((tramo) => tramo.kind === "entrada")
    .map((tramo) => tramo.indice);
  const indiceEntrada =
    entradas.length > 0 ? (entradas[entradas.length - 1] ?? 0) : 0;

  return {
    pasoId: input.pasoId,
    tramos,
    totalTramos,
    personas,
    indicePersona,
    trabajaderas,
    poolPorTrabajadera,
    cargaPorTrabajadera: trabajaderas.map((trabajadera) => trabajadera.carga),
    rPorTrabajadera: trabajaderas.map(
      (trabajadera) => trabajadera.pool.length - trabajadera.carga,
    ),
    boquillas: [...input.boquillas],
    indiceBoquilla,
    indiceTrabajaderaDePersona,
    maxDescansosPorPersona: Math.ceil(totalTramos / 2),
    indiceSalida: indiceSalida >= 0 ? indiceSalida : 0,
    indiceEntrada:
      indiceEntrada >= 0 ? indiceEntrada : Math.max(0, totalTramos - 1),
  };
}

/**
 * Fase A: busca un reparto de descansos que cumpla R1..R4.
 * Devuelve el reparto encontrado o un fallo (agotamiento del presupuesto de nodos).
 */
export function buscarPlan(
  contexto: ContextoSolver,
  prng: PRNG,
): ResultadoBusqueda {
  const totalTramos = contexto.totalTramos;
  const numTrabajaderas = contexto.trabajaderas.length;

  const descansos = new Int32Array(contexto.personas.length);
  const ultimo = new Int32Array(contexto.personas.length).fill(-1);
  const pilaUltimo: number[] = [];
  const patronBoquilla: boolean[][] = contexto.boquillas.map(() =>
    new Array<boolean>(totalTramos).fill(false),
  );
  const reparto: RepartoDescansos = contexto.trabajaderas.map(() =>
    Array.from({ length: totalTramos }, () => new Set<number>()),
  );

  let nodos = 0;
  let agotado = false;

  const aplicar = (persona: number, tramo: number): void => {
    pilaUltimo.push(ultimo[persona] ?? -1);
    descansos[persona] = (descansos[persona] ?? 0) + 1;
    ultimo[persona] = tramo;
    const boquilla = contexto.indiceBoquilla[persona] ?? -1;
    if (boquilla >= 0) {
      const patron = patronBoquilla[boquilla];
      if (patron) patron[tramo] = true;
    }
  };

  const deshacer = (persona: number, tramo: number): void => {
    const anterior = pilaUltimo.pop();
    descansos[persona] = (descansos[persona] ?? 0) - 1;
    ultimo[persona] = anterior ?? -1;
    const boquilla = contexto.indiceBoquilla[persona] ?? -1;
    if (boquilla >= 0) {
      const patron = patronBoquilla[boquilla];
      if (patron) patron[tramo] = false;
    }
  };

  const registrar = (
    trabajadera: number,
    tramo: number,
    persona: number,
  ): void => {
    const celda = reparto[trabajadera]?.[tramo];
    if (celda) celda.add(persona);
  };

  const desregistrar = (
    trabajadera: number,
    tramo: number,
    persona: number,
  ): void => {
    const celda = reparto[trabajadera]?.[tramo];
    if (celda) celda.delete(persona);
  };

  /** R4: las 2 boquillas de la misma trabajadera no pueden descansar a la vez. */
  const descansanLasDosBoquillas = (
    trabajadera: number,
    elegidos: number[],
  ): boolean => {
    const boquilla1 = contexto.boquillas[0];
    const boquilla2 = contexto.boquillas[1];
    if (!boquilla1 || !boquilla2) return false;
    const indice1 = contexto.indicePersona.get(boquilla1);
    const indice2 = contexto.indicePersona.get(boquilla2);
    if (indice1 === undefined || indice2 === undefined) return false;
    const trabajadera1 = contexto.indiceTrabajaderaDePersona.get(boquilla1);
    const trabajadera2 = contexto.indiceTrabajaderaDePersona.get(boquilla2);
    if (trabajadera1 !== trabajadera || trabajadera2 !== trabajadera)
      return false;
    return elegidos.includes(indice1) && elegidos.includes(indice2);
  };

  /**
   * Podas (b) y (e) de §11.2: capacidad de descanso restante por costalero y capacidad
   * con consecutivos (F-3).
   */
  const poda = (trabajadera: number, tramo: number): boolean => {
    const pool = contexto.poolPorTrabajadera[trabajadera] ?? [];
    const r = contexto.rPorTrabajadera[trabajadera] ?? 0;
    const restantes = (totalTramos - tramo - 1) * r;
    let necesidad = 0;
    let capacidad = 0;
    for (const persona of pool) {
      const need = Math.max(
        0,
        DESCANSOS_MINIMOS_POR_COSTALERO - (descansos[persona] ?? 0),
      );
      const descansoAqui = ultimo[persona] === tramo;
      const disponibles = descansoAqui
        ? Math.max(0, totalTramos - tramo - 2)
        : Math.max(0, totalTramos - tramo - 1);
      const maxAdicional = Math.ceil(disponibles / 2);
      if (need > maxAdicional) return false;
      necesidad += need;
      capacidad += maxAdicional;
    }
    if (necesidad > restantes) return false;
    if (capacidad < restantes) return false;
    return true;
  };

  /** Dominio de candidatos del tramo: podas (a) y (c) de §11.2. */
  const candidatosDe = (trabajadera: number, tramo: number): number[] => {
    const pool = contexto.poolPorTrabajadera[trabajadera] ?? [];
    const candidatos: number[] = [];
    for (const persona of pool) {
      // (a) R3: quien descansó en el tramo anterior no puede descansar en este.
      if (tramo > 0 && ultimo[persona] === tramo - 1) continue;
      // (a) R3: nadie puede descansar más de ceil(T/2) veces.
      if ((descansos[persona] ?? 0) >= contexto.maxDescansosPorPersona)
        continue;
      // (c) R4: la otra boquilla ya tiene resuelto su patrón en este tramo.
      const boquilla = contexto.indiceBoquilla[persona] ?? -1;
      if (boquilla >= 0) {
        const otra = 1 - boquilla;
        const otraId = contexto.boquillas[otra];
        if (otraId !== undefined) {
          const trabajaderaOtra =
            contexto.indiceTrabajaderaDePersona.get(otraId) ?? -1;
          if (trabajaderaOtra >= 0 && trabajaderaOtra < trabajadera) {
            const patron = patronBoquilla[otra];
            if (patron && patron[tramo] === true) continue;
          }
        }
      }
      candidatos.push(persona);
    }

    // Orden canónico: primero quien más necesita descansar, después quien más tiempo
    // lleva sin descansar; el desempate lo decide la semilla.
    const barajados = prng.barajar(candidatos);
    barajados.sort((a, b) => {
      const necesidadA = Math.max(
        0,
        DESCANSOS_MINIMOS_POR_COSTALERO - (descansos[a] ?? 0),
      );
      const necesidadB = Math.max(
        0,
        DESCANSOS_MINIMOS_POR_COSTALERO - (descansos[b] ?? 0),
      );
      if (necesidadA !== necesidadB) return necesidadB - necesidadA;
      const libreA = tramo - (ultimo[a] ?? -1);
      const libreB = tramo - (ultimo[b] ?? -1);
      if (libreA !== libreB) return libreB - libreA;
      return 0;
    });
    return barajados;
  };

  /** Clave de equivalencia para la poda de simetría (d). */
  const claveGrupo = (persona: number): string => {
    return (
      String(descansos[persona] ?? 0) +
      "|" +
      String(ultimo[persona] ?? -1) +
      "|" +
      String(contexto.indiceBoquilla[persona] ?? -1)
    );
  };

  const completarTramo = (
    trabajadera: number,
    tramo: number,
    elegidos: number[],
  ): boolean => {
    if (descansanLasDosBoquillas(trabajadera, elegidos)) return false;
    for (const persona of elegidos) registrar(trabajadera, tramo, persona);
    if (poda(trabajadera, tramo)) {
      if (resolver(trabajadera, tramo + 1)) return true;
    }
    for (const persona of elegidos) desregistrar(trabajadera, tramo, persona);
    return false;
  };

  const elegir = (
    trabajadera: number,
    tramo: number,
    candidatos: number[],
    posicion: number,
    elegidos: number[],
    grupos: Map<string, { excluido: boolean }>,
  ): boolean => {
    const r = contexto.rPorTrabajadera[trabajadera] ?? 0;
    if (elegidos.length === r) {
      return completarTramo(trabajadera, tramo, elegidos);
    }
    if (posicion >= candidatos.length) return false;
    const persona = candidatos[posicion];
    if (persona === undefined) return false;

    const clave = claveGrupo(persona);
    let grupo = grupos.get(clave);
    if (!grupo) {
      grupo = { excluido: false };
      grupos.set(clave, grupo);
    }

    // (d) Simetría: dentro de un grupo de equivalentes solo se exploran los prefijos.
    if (!grupo.excluido) {
      aplicar(persona, tramo);
      elegidos.push(persona);
      if (
        elegir(trabajadera, tramo, candidatos, posicion + 1, elegidos, grupos)
      )
        return true;
      elegidos.pop();
      deshacer(persona, tramo);
    }

    const previo = grupo.excluido;
    grupo.excluido = true;
    const ok = elegir(
      trabajadera,
      tramo,
      candidatos,
      posicion + 1,
      elegidos,
      grupos,
    );
    grupo.excluido = previo;
    return ok;
  };

  function resolver(trabajadera: number, tramo: number): boolean {
    nodos++;
    if (nodos > MAX_NODOS_BUSQUEDA) {
      agotado = true;
      return false;
    }
    if (trabajadera >= numTrabajaderas) return true;
    if (tramo >= totalTramos) return resolver(trabajadera + 1, 0);
    const candidatos = candidatosDe(trabajadera, tramo);
    const grupos = new Map<string, { excluido: boolean }>();
    return elegir(trabajadera, tramo, candidatos, 0, [], grupos);
  }

  const encontrado = resolver(0, 0);
  if (!encontrado) return { ok: false, agotado };
  return { ok: true, reparto };
}

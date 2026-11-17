/**
 * Factibilidad del paso: `tramosNecesarios` (§7.3) y las precondiciones F-1..F-6 (§7.4).
 *
 * Estas precondiciones son INGENIERÍA, no reglas del dominio (OP-2): no inventan reglas de
 * relevo, solo comprueban que el plan sea construible antes de calcularlo.
 */

import { DESCANSOS_MINIMOS_POR_COSTALERO, NUMERO_BOQUILLAS } from "./glosario";
import type {
  IdPrecondicion,
  RelevoPlanInput,
  ResultadoFactibilidad,
  ResultadoPrecondicion,
  TrabajaderaEntrada,
} from "./modelo";
import { diagnosticoDePrecondicion } from "./solver/diagnostico";

/** Datos derivados de una trabajadera: `n` costaleros en el pool, `c` de carga y `r` de relevo. */
type DatosTrabajadera = {
  trabajadera: TrabajaderaEntrada;
  pool: number;
  carga: number;
  r: number;
};

/** Calcula `n`, `c` y `r = pool - carga` de cada trabajadera (§7.2, supuesto S-1). */
function datosPorTrabajadera(input: RelevoPlanInput): DatosTrabajadera[] {
  return [...input.trabajaderas]
    .sort((a, b) => a.position - b.position)
    .map((trabajadera) => {
      const pool = trabajadera.pool.length;
      const carga = trabajadera.carga;
      return { trabajadera, pool, carga, r: pool - carga };
    });
}

/**
 * `tramosNecesarios` de §7.3: `ceil(2 · pool / r)` con `r = pool - carga`.
 *
 * Es el mínimo de tramos que necesita UNA trabajadera para que sus costaleros descansen
 * dos veces. Si `r ≤ 0` la trabajadera no tiene suplentes y no existe un número finito de
 * tramos que sirva: se devuelve `Infinity` y la precondición F-1 lo explica con números.
 */
export function tramosNecesarios(trabajadera: {
  pool: number;
  carga: number;
}): number {
  const r = trabajadera.pool - trabajadera.carga;
  if (r <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil((DESCANSOS_MINIMOS_POR_COSTALERO * trabajadera.pool) / r);
}

/**
 * `tramosNecesarios` de una trabajadera del modelo (su pool es la lista de costaleros).
 * Misma fórmula de §7.3; devuelve `Infinity` si no hay suplentes.
 */
export function tramosNecesariosDePool(trabajadera: {
  pool: readonly string[];
  carga: number;
}): number {
  return tramosNecesarios({
    pool: trabajadera.pool.length,
    carga: trabajadera.carga,
  });
}

/**
 * Mínimo `T` que cumple a la vez F-2 (`T·r ≥ 2·pool`) y F-3 (`pool·⌈T/2⌉ ≥ T·r`).
 * Devuelve `null` si ningún `T` los cumple a la vez: entonces hay que bajar la carga.
 */
function tramosMinimosQueCumplenF2Yf3(
  pool: number,
  r: number,
  tActual: number,
): number | null {
  if (r <= 0) return null;
  const minimoPorF2 = Math.ceil((DESCANSOS_MINIMOS_POR_COSTALERO * pool) / r);
  for (let t = Math.max(tActual, minimoPorF2); t <= minimoPorF2 + 200; t++) {
    const cumpleF2 = t * r >= DESCANSOS_MINIMOS_POR_COSTALERO * pool;
    const cumpleF3 = pool * Math.ceil(t / 2) >= t * r;
    if (cumpleF2 && cumpleF3) return t;
  }
  return null;
}

/**
 * Evalúa las precondiciones F-1..F-6 de §7.4 y devuelve su estado, el diagnóstico de la
 * primera incumplida y los `tramosNecesarios` por trabajadera (§7.3).
 *
 * Orden de precedencia del diagnóstico (la spec no lo fija): F-1 → F-6 → F-5 → F-2 → F-3 →
 * F-4. Se anteponen los problemas estructurales (no hay a quién relevar, no hay recorrido,
 * no hay boquillas) a los de capacidad, porque su arreglo es más directo.
 */
export function evaluarFactibilidad(
  input: RelevoPlanInput,
): ResultadoFactibilidad {
  const tramos = [...input.tramos].sort((a, b) => a.ordinal - b.ordinal);
  const totalTramos = tramos.length;
  const datos = datosPorTrabajadera(input);

  const tramosMinimosPorTrabajadera: Record<string, number> = {};
  for (const dato of datos) {
    tramosMinimosPorTrabajadera[dato.trabajadera.id] = tramosNecesarios({
      pool: dato.pool,
      carga: dato.carga,
    });
  }
  const tramosMinimos = datos.reduce(
    (maximo, dato) =>
      Math.max(maximo, tramosMinimosPorTrabajadera[dato.trabajadera.id] ?? 0),
    0,
  );

  const precondiciones: ResultadoPrecondicion[] = [];

  // F-1 — `r ≥ 1` en toda trabajadera: sin suplentes no se puede relevar nunca.
  const falloF1 = datos.find((dato) => dato.r < 1);
  precondiciones.push(
    falloF1
      ? {
          id: "F-1",
          cumple: false,
          mensaje:
            "La trabajadera " +
            String(falloF1.trabajadera.position) +
            " no tiene suplentes: nunca se puede relevar",
          cifras: {
            pool: falloF1.pool,
            carga: falloF1.carga,
            r: falloF1.r,
            posicion: falloF1.trabajadera.position,
          },
          sugerencia:
            "ampliar el pool de la trabajadera " +
            String(falloF1.trabajadera.position) +
            " a " +
            String(falloF1.pool + 1) +
            " costaleros (carga " +
            String(falloF1.carga) +
            ")",
          trabajaderaId: falloF1.trabajadera.id,
        }
      : {
          id: "F-1",
          cumple: true,
          mensaje: "Todas las trabajaderas tienen al menos un suplente",
          cifras: { trabajaderas: datos.length },
          sugerencia: "",
        },
  );

  // F-6 — `T ≥ 2`: tiene que existir salida y entrada.
  precondiciones.push(
    totalTramos >= 2
      ? {
          id: "F-6",
          cumple: true,
          mensaje: "El recorrido tiene " + String(totalTramos) + " tramos",
          cifras: { T: totalTramos, minimo: 2 },
          sugerencia: "",
        }
      : {
          id: "F-6",
          cumple: false,
          mensaje: "El recorrido necesita al menos 2 tramos",
          cifras: {
            T: totalTramos,
            minimo: 2,
            tramosFaltantes: 2 - totalTramos,
          },
          sugerencia:
            "añadir " +
            String(2 - totalTramos) +
            " tramo más al recorrido (mínimo 2)",
        },
  );

  // F-5 — las 2 boquillas existen y son costaleros distintos del paso.
  const personas = new Set<string>();
  for (const dato of datos) {
    for (const costalero of dato.trabajadera.pool) personas.add(costalero);
  }
  const boquillas = input.boquillas;
  const boquillasDistintas = new Set(boquillas).size;
  const boquillasDelPaso = boquillas.filter((boquilla) =>
    personas.has(boquilla),
  ).length;
  const cumpleF5 =
    boquillas.length === NUMERO_BOQUILLAS &&
    boquillasDistintas === NUMERO_BOQUILLAS &&
    boquillasDelPaso === NUMERO_BOQUILLAS;
  precondiciones.push(
    cumpleF5
      ? {
          id: "F-5",
          cumple: true,
          mensaje: "Las 2 boquillas del paso están elegidas",
          cifras: { boquillas: boquillas.length },
          sugerencia: "",
        }
      : {
          id: "F-5",
          cumple: false,
          mensaje: "Hay que elegir las 2 boquillas del paso",
          cifras: {
            boquillas: boquillas.length,
            requeridas: NUMERO_BOQUILLAS,
            distintas: boquillasDistintas,
            delPaso: boquillasDelPaso,
          },
          sugerencia:
            "elegir las 2 boquillas del paso entre los costaleros del paso",
        },
  );

  // F-2 — `T · r ≥ 2 · pool` en toda trabajadera: todos descansan 2 veces.
  const falloF2 = datos.find(
    (dato) =>
      totalTramos * dato.r < DESCANSOS_MINIMOS_POR_COSTALERO * dato.pool,
  );
  const tramosMinimosF2 = falloF2
    ? tramosMinimosQueCumplenF2Yf3(falloF2.pool, falloF2.r, totalTramos)
    : null;
  const tramosFaltantesF2 = Math.max(
    0,
    (tramosMinimosF2 ?? totalTramos) - totalTramos,
  );
  precondiciones.push(
    falloF2
      ? {
          id: "F-2",
          cumple: false,
          mensaje:
            "Faltan " +
            String(tramosFaltantesF2) +
            " tramos para que todos descansen 2 veces",
          cifras: {
            pool: falloF2.pool,
            carga: falloF2.carga,
            r: falloF2.r,
            T: totalTramos,
            tramosMinimos:
              tramosMinimosF2 ??
              tramosMinimosPorTrabajadera[falloF2.trabajadera.id] ??
              0,
            tramosFaltantes: tramosFaltantesF2,
            posicion: falloF2.trabajadera.position,
          },
          sugerencia:
            "agregar " +
            String(tramosFaltantesF2) +
            " tramos al recorrido (T actual " +
            String(totalTramos) +
            ")",
          trabajaderaId: falloF2.trabajadera.id,
        }
      : {
          id: "F-2",
          cumple: true,
          mensaje: "Con los tramos actuales todos pueden descansar 2 veces",
          cifras: { T: totalTramos },
          sugerencia: "",
        },
  );

  // F-3 — `pool · ⌈T/2⌉ ≥ T · r`: nadie puede estar fuera dos relevos seguidos y todos
  // salir 2 veces.
  const falloF3 = datos.find(
    (dato) => dato.pool * Math.ceil(totalTramos / 2) < totalTramos * dato.r,
  );
  precondiciones.push(
    falloF3
      ? {
          id: "F-3",
          cumple: false,
          mensaje:
            "Con " +
            String(totalTramos) +
            " tramos es imposible: nadie puede estar fuera dos relevos seguidos y todos deben salir 2 veces",
          cifras: {
            pool: falloF3.pool,
            carga: falloF3.carga,
            r: falloF3.r,
            T: totalTramos,
            capacidadMaxima: falloF3.pool * Math.ceil(totalTramos / 2),
            descansoTotal: totalTramos * falloF3.r,
            posicion: falloF3.trabajadera.position,
          },
          sugerencia: sugerirArregloF3(falloF3, totalTramos),
          trabajaderaId: falloF3.trabajadera.id,
        }
      : {
          id: "F-3",
          cumple: true,
          mensaje: "Los descansos caben sin dos relevos seguidos",
          cifras: { T: totalTramos },
          sugerencia: "",
        },
  );

  // F-4 — `pool ≥ carga + 1` en toda trabajadera: al menos un suplente por working position.
  const falloF4 = datos.find((dato) => dato.pool < dato.carga + 1);
  precondiciones.push(
    falloF4
      ? {
          id: "F-4",
          cumple: false,
          mensaje:
            "La trabajadera " +
            String(falloF4.trabajadera.position) +
            " necesita al menos 1 suplente",
          cifras: {
            pool: falloF4.pool,
            carga: falloF4.carga,
            r: falloF4.r,
            faltan: falloF4.carga + 1 - falloF4.pool,
            posicion: falloF4.trabajadera.position,
          },
          sugerencia:
            "asignar " +
            String(falloF4.carga + 1 - falloF4.pool) +
            " suplente más a la trabajadera " +
            String(falloF4.trabajadera.position),
          trabajaderaId: falloF4.trabajadera.id,
        }
      : {
          id: "F-4",
          cumple: true,
          mensaje: "Todas las trabajaderas tienen al menos 1 suplente",
          cifras: { trabajaderas: datos.length },
          sugerencia: "",
        },
  );

  const orden: IdPrecondicion[] = ["F-1", "F-6", "F-5", "F-2", "F-3", "F-4"];
  let precondicionFallida: ResultadoPrecondicion | undefined;
  for (const id of orden) {
    const precondicion = precondiciones.find(
      (candidate) => candidate.id === id,
    );
    if (precondicion && !precondicion.cumple) {
      precondicionFallida = precondicion;
      break;
    }
  }

  const factible = precondiciones.every((precondicion) => precondicion.cumple);

  return {
    factible,
    precondiciones,
    diagnostico: precondicionFallida
      ? diagnosticoDePrecondicion(precondicionFallida)
      : null,
    tramosMinimosPorTrabajadera,
    tramosMinimos,
  };
}

/**
 * Sugerencia accionable para F-3: si con más tramos el problema se resuelve, se dice
 * cuántos; si no, hay que bajar la carga de la trabajadera.
 */
function sugerirArregloF3(dato: DatosTrabajadera, totalTramos: number): string {
  const conMasTramos = tramosMinimosQueCumplenF2Yf3(
    dato.pool,
    dato.r,
    totalTramos,
  );
  if (conMasTramos !== null) {
    return (
      "añadir " +
      String(conMasTramos - totalTramos) +
      " tramos al recorrido (T actual " +
      String(totalTramos) +
      ")"
    );
  }
  const cargaMaximaAdmisible = Math.ceil(dato.pool / 2);
  return (
    "bajar la carga de la trabajadera " +
    String(dato.trabajadera.position) +
    " a " +
    String(cargaMaximaAdmisible) +
    " (ahora " +
    String(dato.carga) +
    ") para que quepan los descansos sin dos relevos seguidos"
  );
}

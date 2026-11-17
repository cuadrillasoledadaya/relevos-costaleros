import { describe, expect, it } from "vitest";

import { solvePlanDeRelevos } from "../solver";
import { crearEntrada, crearTramos } from "./ayudas";

/** Paso grande: `numTrabajaderas` trabajaderas de `pool` costaleros y `totalTramos` tramos. */
function crearPasoGrande(
  numTrabajaderas: number,
  poolPorTrabajadera: number,
  totalTramos: number,
) {
  const trabajaderas: Array<{
    id: string;
    position: number;
    carga: number;
    pool: string[];
  }> = [];
  for (let indice = 0; indice < numTrabajaderas; indice++) {
    const pool: string[] = [];
    for (let posicion = 0; posicion < poolPorTrabajadera; posicion++) {
      pool.push(`c${indice + 1}-${posicion + 1}`);
    }
    trabajaderas.push({
      id: `t${indice + 1}`,
      position: indice + 1,
      carga: 5,
      pool,
    });
  }
  const boquillas = [
    trabajaderas[0]?.pool[0] ?? "c1-1",
    trabajaderas[1]?.pool[0] ?? "c2-1",
  ];
  return crearEntrada({
    trabajaderas,
    tramos: crearTramos(totalTramos),
    boquillas,
  });
}

describe("T-BENCH — presupuesto del solver (S-4)", () => {
  it("T-BENCH — pool total ≤ 60 y T ≤ 14 ⇒ solución en menos de 300 ms", () => {
    const entrada = crearPasoGrande(10, 6, 14);
    const costaleros = entrada.trabajaderas.reduce(
      (total, trabajadera) => total + trabajadera.pool.length,
      0,
    );
    expect(costaleros).toBe(60);
    expect(entrada.tramos.length).toBe(14);

    const inicio = performance.now();
    const resultado = solvePlanDeRelevos(entrada);
    const fin = performance.now();
    const duracionMs = fin - inicio;

    console.info(
      `T-BENCH · ${costaleros} costaleros · ${entrada.trabajaderas.length} trabajaderas · T=${entrada.tramos.length} → ${duracionMs.toFixed(1)} ms`,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.stats.cumplimiento.r1).toBe(true);
    expect(resultado.stats.cumplimiento.r2).toBe(true);
    expect(resultado.stats.cumplimiento.r3).toBe(true);
    expect(resultado.stats.cumplimiento.r4).toBe(true);
    expect(duracionMs).toBeLessThan(300);
  });

  it("T-BENCH — el caso canónico (1 trabajadera, pool 6, carga 5, T=12) va rápido", () => {
    const entrada = crearEntrada({ tramos: crearTramos(12) });

    const inicio = performance.now();
    const resultado = solvePlanDeRelevos(entrada);
    const fin = performance.now();
    const duracionMs = fin - inicio;

    console.info(`T-BENCH · caso canónico → ${duracionMs.toFixed(1)} ms`);

    expect(resultado.ok).toBe(true);
    expect(duracionMs).toBeLessThan(300);
  });
});

import { describe, expect, it } from "vitest";

import { checkR1, checkR2, checkR3, checkR4, checkR5 } from "../reglas";
import { solvePlanDeRelevos } from "../solver";
import {
  cambiarDescansan,
  cambiarEnPaso,
  cambiarEstado,
  clonarPlan,
  crearEntrada,
  crearPlanDesdeDescansos,
  crearTramos,
} from "./ayudas";

const TRABAJADERAS_DOS = [
  {
    id: "t1",
    position: 1,
    carga: 5,
    pool: ["c1", "c2", "c3", "c4", "c5", "c6"],
  },
  {
    id: "t2",
    position: 2,
    carga: 5,
    pool: ["c7", "c8", "c9", "c10", "c11", "c12"],
  },
];

describe("R1 — los relevos solo se hacen con compañeros de la misma trabajadera", () => {
  it("R1 — nadie de otra trabajadera entra en una trabajadera", () => {
    const entrada = crearEntrada({
      trabajaderas: TRABAJADERAS_DOS,
      tramos: crearTramos(4),
      boquillas: ["c1", "c7"],
    });
    const plan = crearPlanDesdeDescansos(entrada, {
      tr1: { t1: ["c6"], t2: ["c12"] },
      tr2: { t1: ["c5"], t2: ["c11"] },
      tr3: { t1: ["c4"], t2: ["c10"] },
      tr4: { t1: ["c3"], t2: ["c9"] },
    });

    expect(checkR1(plan, entrada)).toBe(true);

    // Mutación: en el tramo 1 entra en la primera trabajadera alguien de la segunda.
    const mutado = clonarPlan(plan);
    const enPaso = mutado.porTrabajadera["tr1"]?.["t1"]?.enPaso ?? [];
    cambiarEnPaso(mutado, "tr1", "t1", [...enPaso, "c7"]);
    expect(checkR1(mutado, entrada)).toBe(false);
  });
});

describe("R2 — todos los costaleros deben salir al menos dos veces", () => {
  it("R2 — todos descansan al menos 2 veces y, si el recorrido es corto, es infactible", () => {
    const entrada = crearEntrada({ tramos: crearTramos(4) });
    const plan = crearPlanDesdeDescansos(entrada, {
      tr1: { t1: ["c6"] },
      tr2: { t1: ["c5"] },
      tr3: { t1: ["c4"] },
      tr4: { t1: ["c3"] },
    });

    // c1, c2 y c3 no descansan nunca: R2 no se cumple.
    expect(checkR2(plan, entrada)).toBe(false);

    // Con 12 tramos cada uno puede descansar dos veces sin repetir.
    const entradaFactible = crearEntrada({ tramos: crearTramos(12) });
    const planFactible = crearPlanDesdeDescansos(entradaFactible, {
      tr1: { t1: ["c6"] },
      tr2: { t1: ["c5"] },
      tr3: { t1: ["c4"] },
      tr4: { t1: ["c3"] },
      tr5: { t1: ["c2"] },
      tr6: { t1: ["c1"] },
      tr7: { t1: ["c6"] },
      tr8: { t1: ["c5"] },
      tr9: { t1: ["c4"] },
      tr10: { t1: ["c3"] },
      tr11: { t1: ["c2"] },
      tr12: { t1: ["c1"] },
    });
    expect(checkR2(planFactible, entradaFactible)).toBe(true);

    // Con T insuficiente para 2 descansos por persona no hay plan: diagnóstico con números.
    const resultado = solvePlanDeRelevos(entrada);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.diagnostico.codigo).toBe("CUPO_INSUFICIENTE");
      expect(resultado.diagnostico.cifras["tramosFaltantes"]).toBe(8);
    }
  });
});

describe("R3 — nadie puede estar fuera dos relevos seguidos", () => {
  it("R3 — nadie descansa dos tramos seguidos", () => {
    const entrada = crearEntrada({ tramos: crearTramos(4) });
    const plan = crearPlanDesdeDescansos(entrada, {
      tr1: { t1: ["c6"] },
      tr2: { t1: ["c5"] },
      tr3: { t1: ["c4"] },
      tr4: { t1: ["c3"] },
    });
    expect(checkR3(plan, entrada)).toBe(true);

    // Mutación: c6 descansa en los tramos 1 y 2, que son consecutivos.
    const mutado = clonarPlan(plan);
    cambiarEstado(mutado, "tr2", "c6", "descanso");
    cambiarDescansan(mutado, "tr2", "t1", ["c6"]);
    expect(checkR3(mutado, entrada)).toBe(false);
  });
});

describe("R4 — las dos boquillas no pueden coincidir fuera del paso", () => {
  it("R4 — las 2 boquillas nunca descansan a la vez, tampoco en la misma trabajadera", () => {
    const entradaDistintas = crearEntrada({
      trabajaderas: TRABAJADERAS_DOS,
      tramos: crearTramos(4),
      boquillas: ["c1", "c7"],
    });
    const planDistintas = crearPlanDesdeDescansos(entradaDistintas, {
      tr1: { t1: ["c6"], t2: ["c12"] },
      tr2: { t1: ["c5"], t2: ["c11"] },
      tr3: { t1: ["c4"], t2: ["c10"] },
      tr4: { t1: ["c3"], t2: ["c9"] },
    });
    expect(checkR4(planDistintas, entradaDistintas)).toBe(true);

    // Mutación: las dos boquillas descansan a la vez en el tramo 2.
    const mutado = clonarPlan(planDistintas);
    cambiarEstado(mutado, "tr2", "c1", "descanso");
    cambiarEstado(mutado, "tr2", "c7", "descanso");
    cambiarDescansan(mutado, "tr2", "t1", ["c1"]);
    cambiarDescansan(mutado, "tr2", "t2", ["c7"]);
    expect(checkR4(mutado, entradaDistintas)).toBe(false);

    // Caso "misma trabajadera": las dos boquillas en la primera trabajadera.
    const entradaMisma = crearEntrada({
      trabajaderas: [TRABAJADERAS_DOS[0] as (typeof TRABAJADERAS_DOS)[number]],
      tramos: crearTramos(4),
      boquillas: ["c1", "c2"],
    });
    const planMisma = crearPlanDesdeDescansos(entradaMisma, {
      tr1: { t1: ["c6"] },
      tr2: { t1: ["c5"] },
      tr3: { t1: ["c4"] },
      tr4: { t1: ["c3"] },
    });
    expect(checkR4(planMisma, entradaMisma)).toBe(true);

    const mutadoMisma = clonarPlan(planMisma);
    cambiarEstado(mutadoMisma, "tr2", "c1", "descanso");
    cambiarEstado(mutadoMisma, "tr2", "c2", "descanso");
    cambiarDescansan(mutadoMisma, "tr2", "t1", ["c1", "c2"]);
    expect(checkR4(mutadoMisma, entradaMisma)).toBe(false);
  });
});

describe("R5 — los que hacen la salida no deberían hacer la entrada", () => {
  it("R5 — el solapamiento salida/entrada se mide y se minimiza", () => {
    const entrada = crearEntrada({ tramos: crearTramos(4) });
    const plan = crearPlanDesdeDescansos(entrada, {
      tr1: { t1: ["c6"] },
      tr2: { t1: ["c5"] },
      tr3: { t1: ["c4"] },
      tr4: { t1: ["c3"] },
    });

    const medida = checkR5(plan, entrada);
    // Cota inferior por principio del palomar: 2·carga - pool = 2·5 - 6 = 4.
    expect(medida.maximo).toBe(4);
    expect(medida.valor).toBe(4);
    expect(medida.valor).toBeGreaterThanOrEqual(medida.maximo);

    // Mutación: en la entrada va exactamente la misma gente que en la salida.
    const mutado = clonarPlan(plan);
    cambiarDescansan(mutado, "tr4", "t1", ["c6"]);
    for (const costalero of ["c1", "c2", "c3", "c4", "c5"]) {
      cambiarEstado(mutado, "tr4", costalero, "en_paso");
    }
    cambiarEstado(mutado, "tr4", "c6", "descanso");
    const medidaMutada = checkR5(mutado, entrada);
    expect(medidaMutada.valor).toBe(5);
    expect(medidaMutada.valor).toBeGreaterThan(medida.valor);
  });
});

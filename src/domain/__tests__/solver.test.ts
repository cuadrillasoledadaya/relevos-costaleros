import { describe, expect, it } from "vitest";

import { calcularDispersion } from "../reglas";
import { SOLVER_VERSION, solvePlanDeRelevos, verificarPlan } from "../solver";
import { clonarPlan, crearEntrada, crearTramos } from "./ayudas";

/** Caso canónico: 1 trabajadera, pool 6, carga 5 → hace falta T = 12 (§7.3). */
const ENTRADA_CANONICA = crearEntrada({ tramos: crearTramos(12) });

/** Paso con 3 trabajaderas, 2 boquillas en trabajaderas distintas. */
const ENTRADA_TRES_TRABAJADERAS = crearEntrada({
  trabajaderas: [
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
    {
      id: "t3",
      position: 3,
      carga: 5,
      pool: ["c13", "c14", "c15", "c16", "c17", "c18"],
    },
  ],
  tramos: crearTramos(12),
  boquillas: ["c1", "c7"],
});

describe("solver — caso canónico", () => {
  it("devuelve un plan válido con la dispersión de descansos ≤ 1 dentro del pool", () => {
    const resultado = solvePlanDeRelevos(ENTRADA_CANONICA);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.plan.solverVersion).toBe(SOLVER_VERSION);
    expect(resultado.stats.cumplimiento.r1).toBe(true);
    expect(resultado.stats.cumplimiento.r2).toBe(true);
    expect(resultado.stats.cumplimiento.r3).toBe(true);
    expect(resultado.stats.cumplimiento.r4).toBe(true);

    const dispersion = calcularDispersion(resultado.plan, ENTRADA_CANONICA);
    expect(Object.values(dispersion.porTrabajadera)).toEqual([0]);
    expect(dispersion.global).toBeLessThanOrEqual(1);

    // Todo el mundo descansa lo mismo: con 12 tramos y 1 suplente por tramo, 2 descansos.
    for (const cuenta of Object.values(resultado.stats.descansosPorCostalero)) {
      expect(cuenta).toBe(2);
    }
  });

  it("resuelve un paso de 3 trabajaderas con las reglas duras cumplidas", () => {
    const resultado = solvePlanDeRelevos(ENTRADA_TRES_TRABAJADERAS);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.stats.cumplimiento.r1).toBe(true);
    expect(resultado.stats.cumplimiento.r2).toBe(true);
    expect(resultado.stats.cumplimiento.r3).toBe(true);
    expect(resultado.stats.cumplimiento.r4).toBe(true);
    for (const dispersion of Object.values(
      resultado.stats.dispercionPorTrabajadera,
    )) {
      expect(dispersion).toBeLessThanOrEqual(1);
    }
  });

  it("con 4 tramos y pool 6 la dispersión es 0 si la carga deja 2 descansos por persona", () => {
    // Pool 6 y carga 3 → 3 descansantes por tramo → 4·3 = 12 = 2·6: cada uno descansa 2.
    const entrada = crearEntrada({
      trabajaderas: [
        {
          id: "t1",
          position: 1,
          carga: 3,
          pool: ["c1", "c2", "c3", "c4", "c5", "c6"],
        },
      ],
      tramos: crearTramos(4),
      boquillas: ["c1", "c2"],
    });
    const resultado = solvePlanDeRelevos(entrada);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.stats.cumplimiento.r1).toBe(true);
    expect(resultado.stats.cumplimiento.r2).toBe(true);
    expect(resultado.stats.cumplimiento.r3).toBe(true);
    expect(resultado.stats.cumplimiento.r4).toBe(true);
    expect(Object.values(resultado.stats.dispercionPorTrabajadera)).toEqual([
      0,
    ]);
    for (const cuenta of Object.values(resultado.stats.descansosPorCostalero)) {
      expect(cuenta).toBe(2);
    }
  });
});

describe("solver — infactibilidad con números", () => {
  it("sin suplentes (pool 5, carga 5) devuelve SIN_SUPLENTES con las cifras correctas", () => {
    const entrada = crearEntrada({
      trabajaderas: [
        {
          id: "t1",
          position: 1,
          carga: 5,
          pool: ["c1", "c2", "c3", "c4", "c5"],
        },
      ],
      tramos: crearTramos(4),
      boquillas: ["c1", "c2"],
    });
    const resultado = solvePlanDeRelevos(entrada);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.diagnostico.codigo).toBe("SIN_SUPLENTES");
    expect(resultado.diagnostico.cifras["pool"]).toBe(5);
    expect(resultado.diagnostico.cifras["carga"]).toBe(5);
    expect(resultado.diagnostico.cifras["r"]).toBe(0);
    expect(resultado.diagnostico.trabajaderaId).toBe("t1");
  });

  it("con T insuficiente para 2 descansos por persona devuelve CUPO_INSUFICIENTE", () => {
    // Pool 6, carga 5 → 1 suplente por tramo: 4 tramos dan 4 descansos y hacen falta 12.
    const entrada = crearEntrada({ tramos: crearTramos(4) });
    const resultado = solvePlanDeRelevos(entrada);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.diagnostico.codigo).toBe("CUPO_INSUFICIENTE");
    expect(resultado.diagnostico.cifras["tramosFaltantes"]).toBe(8);
    expect(resultado.diagnostico.sugerencia).toContain("8");
    expect(resultado.diagnostico.mensaje).toContain("8");
  });

  it("pool 6 con carga 5 y 4 tramos es el mismo caso infactible (no hay plan que devolver)", () => {
    // El caso canónico del briefing (1 trabajadera, pool 6, carga 5, 4 tramos) choca con
    // F-2: 4·1 = 4 descansos y hacen falta 2·6 = 12. Con T = 12 sí hay plan.
    const entrada = crearEntrada({ tramos: crearTramos(4) });
    const resultado = solvePlanDeRelevos(entrada);
    expect(resultado.ok).toBe(false);

    const entradaConT12 = crearEntrada({ tramos: crearTramos(12) });
    const resultadoConT12 = solvePlanDeRelevos(entradaConT12);
    expect(resultadoConT12.ok).toBe(true);
  });
});

describe("T-DET — el mismo input con la misma semilla da el mismo plan", () => {
  it("T-DET — dos ejecuciones con la misma semilla son byte a byte iguales", () => {
    const primero = solvePlanDeRelevos(ENTRADA_CANONICA, { seed: 20250330 });
    const segundo = solvePlanDeRelevos(ENTRADA_CANONICA, { seed: 20250330 });

    expect(primero.ok).toBe(true);
    expect(segundo.ok).toBe(true);
    if (!primero.ok || !segundo.ok) return;

    expect(JSON.stringify(segundo.plan)).toBe(JSON.stringify(primero.plan));
    expect(JSON.stringify(segundo.stats)).toBe(JSON.stringify(primero.stats));
  });

  it("T-DET — con semillas distintas el plan cambia (salvo casos equivalentes)", () => {
    const referencia = solvePlanDeRelevos(ENTRADA_CANONICA, { seed: 20250330 });
    expect(referencia.ok).toBe(true);
    if (!referencia.ok) return;

    const planReferencia = JSON.stringify(referencia.plan);
    const alternativas = [1, 2, 3, 4, 5].map((seed) =>
      solvePlanDeRelevos(ENTRADA_CANONICA, { seed }),
    );
    for (const alternativa of alternativas) {
      expect(alternativa.ok).toBe(true);
    }
    const distintos = alternativas.filter(
      (alternativa) =>
        alternativa.ok && JSON.stringify(alternativa.plan) !== planReferencia,
    );
    expect(distintos.length).toBeGreaterThan(0);
  });
});

describe("T-VERIF — la verificación independiente acepta el plan propio y rechaza un plan mutado", () => {
  it("T-VERIF — verificarPlan acepta el plan del solver y rechaza el plan mutado", () => {
    const resultado = solvePlanDeRelevos(ENTRADA_CANONICA);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const verificado = verificarPlan(resultado.plan, ENTRADA_CANONICA);
    expect(verificado.cumplimiento.r1).toBe(true);
    expect(verificado.cumplimiento.r2).toBe(true);
    expect(verificado.cumplimiento.r3).toBe(true);
    expect(verificado.cumplimiento.r4).toBe(true);

    // Mutación manual: en el primer tramo alguien de otra posición entra en el paso.
    const mutado = clonarPlan(resultado.plan);
    const declaracion = mutado.porTrabajadera["tr1"]?.["t1"];
    expect(declaracion).toBeDefined();
    if (!declaracion) return;
    declaracion.enPaso = [...declaracion.enPaso, "c99"];

    const verificadoMutado = verificarPlan(mutado, ENTRADA_CANONICA);
    expect(verificadoMutado.cumplimiento.r1).toBe(false);
  });

  it("T-VERIF — un plan mutado que rompe R2 o R3 también se rechaza", () => {
    const resultado = solvePlanDeRelevos(ENTRADA_CANONICA);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    // R2: c1 pasa a estar siempre en el paso.
    const sinDescansos = clonarPlan(resultado.plan);
    for (const tramo of ENTRADA_CANONICA.tramos) {
      const estadosTramo = sinDescansos.estados[tramo.id];
      if (!estadosTramo) continue;
      estadosTramo["c1"] = "en_paso";
      const declaracion = sinDescansos.porTrabajadera[tramo.id]?.["t1"];
      if (!declaracion) continue;
      declaracion.descansan = declaracion.descansan.filter(
        (costalero) => costalero !== "c1",
      );
      declaracion.enPaso = [...declaracion.enPaso, "c1"];
    }
    const verificadoSinDescansos = verificarPlan(
      sinDescansos,
      ENTRADA_CANONICA,
    );
    expect(verificadoSinDescansos.cumplimiento.r2).toBe(false);

    // R3: c1 descansa en dos tramos consecutivos.
    const consecutivos = clonarPlan(resultado.plan);
    const primero = ENTRADA_CANONICA.tramos[0];
    const segundo = ENTRADA_CANONICA.tramos[1];
    if (!primero || !segundo) return;
    const estadosPrimero = consecutivos.estados[primero.id];
    const estadosSegundo = consecutivos.estados[segundo.id];
    if (!estadosPrimero || !estadosSegundo) return;
    estadosPrimero["c1"] = "descanso";
    estadosSegundo["c1"] = "descanso";
    const verificadoConsecutivos = verificarPlan(
      consecutivos,
      ENTRADA_CANONICA,
    );
    expect(verificadoConsecutivos.cumplimiento.r3).toBe(false);
  });
});

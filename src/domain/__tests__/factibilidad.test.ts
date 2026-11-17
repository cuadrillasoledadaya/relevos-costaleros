import { describe, expect, it } from "vitest";

import { evaluarFactibilidad, tramosNecesarios } from "../factibilidad";
import { crearEntrada, crearTramos } from "./ayudas";

/** Precondición por su identificador. */
function precondicion(
  resultado: ReturnType<typeof evaluarFactibilidad>,
  id: string,
): ReturnType<typeof evaluarFactibilidad>["precondiciones"][number] {
  const encontrada = resultado.precondiciones.find(
    (precondicion) => precondicion.id === id,
  );
  if (!encontrada) throw new Error(`No existe la precondición ${id}`);
  return encontrada;
}

describe("T-FACT — cada precondición F-1..F-6 produce su diagnóstico con números", () => {
  it("F-1 — una trabajadera sin suplentes no se puede relevar nunca", () => {
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
    const resultado = evaluarFactibilidad(entrada);

    expect(resultado.factible).toBe(false);
    const f1 = precondicion(resultado, "F-1");
    expect(f1.cumple).toBe(false);
    expect(f1.cifras["pool"]).toBe(5);
    expect(f1.cifras["carga"]).toBe(5);
    expect(f1.cifras["r"]).toBe(0);
    expect(f1.mensaje).toContain("no tiene suplentes");
    expect(resultado.diagnostico?.codigo).toBe("SIN_SUPLENTES");
    expect(resultado.diagnostico?.cifras["r"]).toBe(0);
  });

  it("F-2 — con pocos tramos no todos pueden descansar dos veces", () => {
    const entrada = crearEntrada({ tramos: crearTramos(4) });
    const resultado = evaluarFactibilidad(entrada);

    expect(resultado.factible).toBe(false);
    const f2 = precondicion(resultado, "F-2");
    expect(f2.cumple).toBe(false);
    expect(f2.cifras["T"]).toBe(4);
    expect(f2.cifras["pool"]).toBe(6);
    expect(f2.cifras["carga"]).toBe(5);
    expect(f2.cifras["r"]).toBe(1);
    expect(f2.cifras["tramosMinimos"]).toBe(12);
    expect(f2.cifras["tramosFaltantes"]).toBe(8);
    expect(f2.sugerencia).toContain("8");
    expect(resultado.diagnostico?.codigo).toBe("CUPO_INSUFICIENTE");
    expect(resultado.diagnostico?.cifras["tramosFaltantes"]).toBe(8);
  });

  it("F-3 — con T tramos es imposible si nadie puede descansar dos relevos seguidos", () => {
    // Pool 6, carga 1 → 5 descansantes por tramo: en 3 tramo son 15 descansos y la
    // capacidad con consecutivos es 6·⌈3/2⌉ = 12.
    const entrada = crearEntrada({
      trabajaderas: [
        {
          id: "t1",
          position: 1,
          carga: 1,
          pool: ["c1", "c2", "c3", "c4", "c5", "c6"],
        },
      ],
      tramos: crearTramos(3),
      boquillas: ["c1", "c2"],
    });
    const resultado = evaluarFactibilidad(entrada);

    expect(resultado.factible).toBe(false);
    const f3 = precondicion(resultado, "F-3");
    expect(f3.cumple).toBe(false);
    expect(f3.cifras["T"]).toBe(3);
    expect(f3.cifras["r"]).toBe(5);
    expect(f3.cifras["capacidadMaxima"]).toBe(12);
    expect(f3.cifras["descansoTotal"]).toBe(15);
    expect(f3.mensaje).toContain("imposible");
    expect(resultado.diagnostico?.codigo).toBe("CAPACIDAD_CONSECUTIVOS");
  });

  it("F-4 — una trabajadera necesita al menos un suplente", () => {
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
    const resultado = evaluarFactibilidad(entrada);

    const f4 = precondicion(resultado, "F-4");
    expect(f4.cumple).toBe(false);
    expect(f4.cifras["pool"]).toBe(5);
    expect(f4.cifras["carga"]).toBe(5);
    expect(f4.cifras["faltan"]).toBe(1);
    expect(f4.mensaje).toContain("necesita al menos 1 suplente");
  });

  it("F-5 — hay que elegir las 2 boquillas del paso", () => {
    const sinSegunda = crearEntrada({ boquillas: ["c1"] });
    const resultadoSinSegunda = evaluarFactibilidad(sinSegunda);
    const f5SinSegunda = precondicion(resultadoSinSegunda, "F-5");
    expect(f5SinSegunda.cumple).toBe(false);
    expect(f5SinSegunda.cifras["boquillas"]).toBe(1);
    expect(f5SinSegunda.cifras["requeridas"]).toBe(2);
    expect(resultadoSinSegunda.diagnostico?.codigo).toBe(
      "BOQUILLAS_CONFLICTIVAS",
    );

    const repetida = crearEntrada({ boquillas: ["c1", "c1"] });
    const resultadoRepetida = evaluarFactibilidad(repetida);
    const f5Repetida = precondicion(resultadoRepetida, "F-5");
    expect(f5Repetida.cumple).toBe(false);
    expect(f5Repetida.cifras["distintas"]).toBe(1);
    expect(resultadoRepetida.diagnostico?.codigo).toBe(
      "BOQUILLAS_CONFLICTIVAS",
    );
  });

  it("F-6 — el recorrido necesita al menos 2 tramos", () => {
    const entrada = crearEntrada({ tramos: crearTramos(1) });
    const resultado = evaluarFactibilidad(entrada);

    expect(resultado.factible).toBe(false);
    const f6 = precondicion(resultado, "F-6");
    expect(f6.cumple).toBe(false);
    expect(f6.cifras["T"]).toBe(1);
    expect(f6.cifras["minimo"]).toBe(2);
    expect(f6.mensaje).toContain("al menos 2 tramos");
    expect(resultado.diagnostico?.codigo).toBe("TRAMOS_INSUFICIENTES");
  });

  it("un paso factible cumple las seis precondiciones", () => {
    const entrada = crearEntrada({ tramos: crearTramos(12) });
    const resultado = evaluarFactibilidad(entrada);

    expect(resultado.factible).toBe(true);
    expect(resultado.diagnostico).toBeNull();
    expect(resultado.precondiciones).toHaveLength(6);
    for (const precondicion of resultado.precondiciones) {
      expect(precondicion.cumple).toBe(true);
    }
    expect(resultado.tramosMinimos).toBe(12);
    expect(resultado.tramosMinimosPorTrabajadera["t1"]).toBe(12);
  });
});

describe("tramosNecesarios (§7.3)", () => {
  it("calcula ceil(2 · pool / r) con r = pool - carga", () => {
    expect(tramosNecesarios({ pool: 6, carga: 5 })).toBe(12);
    expect(tramosNecesarios({ pool: 10, carga: 5 })).toBe(4);
    expect(tramosNecesarios({ pool: 6, carga: 4 })).toBe(6);
    // Sin suplentes no hay número finito de tramos que valga.
    expect(tramosNecesarios({ pool: 5, carga: 5 })).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

import { describe, expect, it } from "vitest";

import { avisosDeCoherencia, tiposCanonicos } from "@/domain/tramos";

/** Tramo de prueba para las reglas del recorrido (§8.3). */
function tramo(
  id: string,
  ordinal: number,
  kind: "salida" | "normal" | "entrada",
  name = `Tramo ${String(ordinal)}`,
) {
  return { id, name, ordinal, kind };
}

describe("reglas del recorrido de tramos", () => {
  it("los tipos canónicos son salida, normales y entrada", () => {
    expect(tiposCanonicos(1)).toEqual(["salida"]);
    expect(tiposCanonicos(2)).toEqual(["salida", "entrada"]);
    expect(tiposCanonicos(4)).toEqual([
      "salida",
      "normal",
      "normal",
      "entrada",
    ]);
  });

  it("no avisa cuando el recorrido es coherente", () => {
    const avisos = avisosDeCoherencia([
      tramo("a", 1, "salida", "Salida"),
      tramo("b", 2, "normal", "Tramo 2"),
      tramo("c", 3, "entrada", "Entrada"),
    ]);

    expect(avisos).toEqual([]);
  });

  it("avisa cuando el primer tramo no es la salida", () => {
    const avisos = avisosDeCoherencia([
      tramo("a", 1, "normal", "Salida"),
      tramo("b", 2, "entrada", "Entrada"),
    ]);

    expect(
      avisos.some((aviso) => aviso.mensaje.includes("no es la salida")),
    ).toBe(true);
  });

  it("avisa cuando el último tramo no es la entrada", () => {
    const avisos = avisosDeCoherencia([
      tramo("a", 1, "salida", "Salida"),
      tramo("b", 2, "normal", "Entrada"),
    ]);

    expect(
      avisos.some((aviso) => aviso.mensaje.includes("no es la entrada")),
    ).toBe(true);
  });

  it("avisa cuando hay más de una salida o más de una entrada", () => {
    const avisos = avisosDeCoherencia([
      tramo("a", 1, "salida", "Salida"),
      tramo("b", 2, "salida", "Tramo 2"),
      tramo("c", 3, "entrada", "Tramo 3"),
      tramo("d", 4, "entrada", "Entrada"),
    ]);

    expect(
      avisos.some((aviso) =>
        aviso.mensaje.includes("2 tramos marcados como salida"),
      ),
    ).toBe(true);
    expect(
      avisos.some((aviso) =>
        aviso.mensaje.includes("2 tramos marcados como entrada"),
      ),
    ).toBe(true);
  });

  it("avisa cuando el recorrido no tiene los dos tramos mínimos", () => {
    expect(
      avisosDeCoherencia([]).some((aviso) =>
        aviso.mensaje.includes("no tiene tramos"),
      ),
    ).toBe(true);
    expect(
      avisosDeCoherencia([tramo("a", 1, "salida")]).some((aviso) =>
        aviso.mensaje.includes("un solo tramo"),
      ),
    ).toBe(true);
  });
});

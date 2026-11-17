import { describe, expect, it } from "vitest";
import {
  asignacionSchema,
  costaleroSchema,
  cuadrillaSchema,
  pasoSchema,
  planSchema,
  relevoSchema,
  tramoSchema,
  trabajaderaSchema,
} from "../../../lib/schemas";
import { IDS } from "./fixtures";

describe("schemas de escritura", () => {
  it("acepta una cuadrilla válida y rechaza datos inválidos", () => {
    const valido = cuadrillaSchema.safeParse({
      name: "Cuadrilla del centro",
      season: 2025,
      owner_id: IDS.capatazA,
    });

    expect(valido.success).toBe(true);
    if (valido.success) {
      expect(valido.data.name).toBe("Cuadrilla del centro");
    }

    const invalido = cuadrillaSchema.safeParse({
      name: "",
      season: 0,
      owner_id: "no-uuid",
    });
    expect(invalido.success).toBe(false);
    if (!invalido.success) {
      expect(invalido.error.issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("valida costaleros, pasos y trabajaderas", () => {
    expect(
      costaleroSchema.safeParse({
        cuadrilla_id: IDS.cuadrillaA,
        full_name: "Ana",
      }).success,
    ).toBe(true);
    expect(
      costaleroSchema.safeParse({ cuadrilla_id: IDS.cuadrillaA, full_name: "" })
        .success,
    ).toBe(false);
    expect(
      pasoSchema.safeParse({
        cuadrilla_id: IDS.cuadrillaA,
        name: "Cristo de la Salud",
        season: 2025,
        num_trabajaderas: 6,
      }).success,
    ).toBe(true);
    expect(
      pasoSchema.safeParse({
        cuadrilla_id: IDS.cuadrillaA,
        name: "Paso",
        season: 2025,
        num_trabajaderas: 13,
      }).success,
    ).toBe(false);
    expect(
      trabajaderaSchema.safeParse({ paso_id: IDS.pasoA, position: 1, carga: 5 })
        .success,
    ).toBe(true);
    expect(
      trabajaderaSchema.safeParse({ paso_id: IDS.pasoA, position: 0, carga: 6 })
        .success,
    ).toBe(false);
  });

  it("valida asignaciones, tramos, planes y relevos", () => {
    expect(
      asignacionSchema.safeParse({
        trabajadera_id: IDS.trabajaderaA,
        costalero_id: IDS.costaleroA,
        is_boquilla: true,
      }).success,
    ).toBe(true);
    expect(
      tramoSchema.safeParse({
        paso_id: IDS.pasoA,
        name: "Salida",
        ordinal: 1,
        kind: "salida",
      }).success,
    ).toBe(true);
    expect(
      tramoSchema.safeParse({
        paso_id: IDS.pasoA,
        name: "Tramo",
        ordinal: 0,
        kind: "otro",
      }).success,
    ).toBe(false);
    expect(
      planSchema.safeParse({
        paso_id: IDS.pasoA,
        version: 1,
        seed: 20250330,
        solver_version: "1.0.0",
      }).success,
    ).toBe(true);
    expect(
      relevoSchema.safeParse({
        plan_id: IDS.planPublicado,
        tramo_id: IDS.tramoA,
        costalero_id: IDS.costaleroA,
        estado: "descanso",
      }).success,
    ).toBe(true);
    expect(
      relevoSchema.safeParse({
        plan_id: IDS.planPublicado,
        tramo_id: IDS.tramoA,
        costalero_id: IDS.costaleroA,
        estado: "fuera",
      }).success,
    ).toBe(false);
  });
});

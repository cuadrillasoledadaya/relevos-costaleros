import { describe, expect, it } from "vitest";

import {
  cambiarTipoTramo,
  crearTramo,
  eliminarTramo,
  reordenarTramos,
  renombrarTramo,
} from "@/server/actions/tramo";

import {
  PASO_ID,
  TRAMO_1,
  TRAMO_2,
  TRAMO_3,
  TRAMO_4,
  crearAlmacen,
  crearRepositorio,
} from "./dobles";

describe("W6 · server actions de los tramos", () => {
  it("añade un tramo al final del recorrido y recalcula la salida y la entrada", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await crearTramo(
      { pasoId: PASO_ID, nombre: "Vuelta a la plaza" },
      repos,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const tramos = resultado.datos.tramos;
    expect(tramos).toHaveLength(5);
    expect(tramos.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(tramos[0]?.kind).toBe("salida");
    expect(tramos[tramos.length - 1]?.name).toBe("Vuelta a la plaza");
    expect(tramos[tramos.length - 1]?.kind).toBe("entrada");
    // El tramo que era la entrada deja de serlo: sólo hay una entrada.
    expect(tramos.filter((tramo) => tramo.kind === "entrada")).toHaveLength(1);
  });

  it("no guarda un tramo sin nombre y lo dice en español", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await crearTramo(
      { pasoId: PASO_ID, nombre: "   " },
      repos,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBe("El nombre del tramo no puede estar vacío.");
    expect(almacen).toHaveLength(4);
  });

  it("renombra un tramo sin tocar su ordinal ni su tipo", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await renombrarTramo(
      { pasoId: PASO_ID, tramoId: TRAMO_2, nombre: "Plaza del pueblo" },
      repos,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const renombrado = resultado.datos.tramos.find(
      (tramo) => tramo.id === TRAMO_2,
    );
    expect(renombrado?.name).toBe("Plaza del pueblo");
    expect(renombrado?.ordinal).toBe(2);
    expect(renombrado?.kind).toBe("normal");
  });

  it("reordena el recorrido sin dejar ordinales repetidos ni huecos", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await reordenarTramos(
      { pasoId: PASO_ID, orden: [TRAMO_4, TRAMO_1, TRAMO_3, TRAMO_2] },
      repos,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const tramos = resultado.datos.tramos;
    expect(tramos.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3, 4]);
    expect(tramos.map((tramo) => tramo.id)).toEqual([
      TRAMO_4,
      TRAMO_1,
      TRAMO_3,
      TRAMO_2,
    ]);
    // Los tipos canónicos se recalculan: el primero es la salida y el último
    // la entrada.
    expect(tramos[0]?.kind).toBe("salida");
    expect(tramos[3]?.kind).toBe("entrada");
  });

  it("rechaza un orden con el mismo tramo dos veces y no cambia nada", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await reordenarTramos(
      { pasoId: PASO_ID, orden: [TRAMO_1, TRAMO_1, TRAMO_3, TRAMO_2] },
      repos,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain("dos veces");
    expect(almacen.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3, 4]);
  });

  it("borra un tramo intermedio y renumera los que quedan", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await eliminarTramo(
      { pasoId: PASO_ID, tramoId: TRAMO_2 },
      repos,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const tramos = resultado.datos.tramos;
    expect(tramos).toHaveLength(3);
    expect(tramos.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3]);
    expect(tramos.map((tramo) => tramo.id)).toEqual([
      TRAMO_1,
      TRAMO_3,
      TRAMO_4,
    ]);
    expect(tramos[0]?.kind).toBe("salida");
    expect(tramos[2]?.kind).toBe("entrada");
  });

  it("avisa cuando el recorrido queda incoherente", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await cambiarTipoTramo(
      { pasoId: PASO_ID, tramoId: TRAMO_1, tipo: "normal" },
      repos,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.avisos.length).toBeGreaterThan(0);
    expect(
      resultado.datos.avisos.some((aviso) =>
        aviso.mensaje.includes("no es la salida"),
      ),
    ).toBe(true);
  });

  it("no deja tocar un tramo de otro paso", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);

    const resultado = await renombrarTramo(
      {
        pasoId: "22222222-2222-4222-8222-222222222299",
        tramoId: TRAMO_1,
        nombre: "Intruso",
      },
      repos,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBe("El tramo no pertenece a este paso.");
    expect(almacen.find((tramo) => tramo.id === TRAMO_1)?.name).toBe("Salida");
  });

  it("deja intactos el nombre y el tipo cuando la actualización atómica falla", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorio(almacen);
    repos.actualizarEnRecorrido = async () => ({
      data: [],
      error: { message: "No se ha podido actualizar el tramo." },
    });

    const renombre = await renombrarTramo(
      { pasoId: PASO_ID, tramoId: TRAMO_2, nombre: "Plaza del pueblo" },
      repos,
    );
    const tipo = await cambiarTipoTramo(
      { pasoId: PASO_ID, tramoId: TRAMO_2, tipo: "entrada" },
      repos,
    );

    expect(renombre.ok).toBe(false);
    expect(tipo.ok).toBe(false);
    expect(almacen.find((tramo) => tramo.id === TRAMO_2)).toMatchObject({
      name: "Tramo 2",
      kind: "normal",
    });
  });
});

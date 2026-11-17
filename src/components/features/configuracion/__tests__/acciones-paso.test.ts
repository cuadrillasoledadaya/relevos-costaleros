import { describe, expect, it } from "vitest";

import {
  crearPaso,
  fijarBoquillas,
  guardarDatosPaso,
  guardarReparto,
  guardarTramos,
} from "@/server/actions/paso";

import {
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  CUADRILLA_ID,
  PASO_ID,
  T1,
  T2,
  crearAlmacen,
  crearRepositorios,
} from "./dobles";

describe("W5 · server actions del paso", () => {
  it("un costalero asignado a dos pools se rechaza y no se persiste la asignación duplicada", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    const resultado = await guardarReparto(
      {
        pasoId: PASO_ID,
        reparto: [
          { trabajaderaId: T1, costaleros: [C1, C2], carga: 5 },
          { trabajaderaId: T2, costaleros: [C2, C3], carga: 5 },
        ],
      },
      repos,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain("solo puede estar en un pool");
    // Nada persistido: ni una asignación duplicada ni el resto del reparto.
    expect(almacen.asignaciones).toHaveLength(0);
  });

  it("rechaza mover a un costalero a otra trabajadera sin quitarlo de la anterior", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    await guardarReparto(
      {
        pasoId: PASO_ID,
        reparto: [{ trabajaderaId: T1, costaleros: [C1, C2], carga: 5 }],
      },
      repos,
    );

    // Solo se envía la segunda trabajadera: C1 se quedaría en las dos.
    const resultado = await guardarReparto(
      {
        pasoId: PASO_ID,
        reparto: [{ trabajaderaId: T2, costaleros: [C1], carga: 5 }],
      },
      repos,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain("solo puede estar en un pool");
    expect(
      almacen.asignaciones.filter(
        (asignacion) => asignacion.costalero_id === C1,
      ),
    ).toHaveLength(1);
    expect(
      almacen.asignaciones.find((asignacion) => asignacion.costalero_id === C1)
        ?.trabajadera_id,
    ).toBe(T1);
  });

  it("guarda el reparto con un costalero en un solo pool y respeta la carga", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    const resultado = await guardarReparto(
      {
        pasoId: PASO_ID,
        reparto: [
          { trabajaderaId: T1, costaleros: [C1, C2, C3], carga: 5 },
          { trabajaderaId: T2, costaleros: [C4], carga: 2 },
        ],
      },
      repos,
    );

    expect(resultado.ok).toBe(true);
    expect(almacen.asignaciones).toHaveLength(4);
    expect(
      almacen.asignaciones.filter(
        (asignacion) => asignacion.trabajadera_id === T2,
      ),
    ).toHaveLength(1);
    expect(
      almacen.trabajaderas.find((trabajadera) => trabajadera.id === T2)?.carga,
    ).toBe(2);
  });

  it("las boquillas tienen que ser 2 costaleros distintos del paso", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    await guardarReparto(
      {
        pasoId: PASO_ID,
        reparto: [{ trabajaderaId: T1, costaleros: [C1, C2], carga: 5 }],
      },
      repos,
    );

    const repetida = await fijarBoquillas(
      { pasoId: PASO_ID, boquillas: [C1, C1] },
      repos,
    );
    expect(repetida.ok).toBe(false);

    const fueraDelPaso = await fijarBoquillas(
      { pasoId: PASO_ID, boquillas: [C1, C3] },
      repos,
    );
    expect(fueraDelPaso.ok).toBe(false);
    if (fueraDelPaso.ok) return;
    expect(fueraDelPaso.error).toContain("costaleros del paso");

    const correcta = await fijarBoquillas(
      { pasoId: PASO_ID, boquillas: [C1, C2] },
      repos,
    );
    expect(correcta.ok).toBe(true);
    expect(
      almacen.asignaciones.filter((asignacion) => asignacion.is_boquilla),
    ).toHaveLength(2);
  });

  it("un paso guardado y recargado conserva exactamente lo configurado", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    const creado = await crearPaso(
      {
        cuadrillaId: CUADRILLA_ID,
        nombre: "Cristo de la Salud",
        anio: 2025,
        numTrabajaderas: 2,
      },
      repos,
    );
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;
    const pasoId = creado.datos.pasoId;

    const trabajaderasCreadas = almacen.trabajaderas
      .filter((trabajadera) => trabajadera.paso_id === pasoId)
      .sort((a, b) => a.position - b.position);
    expect(trabajaderasCreadas).toHaveLength(2);

    await guardarReparto(
      {
        pasoId,
        reparto: [
          {
            trabajaderaId: trabajaderasCreadas[0]?.id ?? "",
            costaleros: [C1, C2, C3],
            carga: 5,
          },
          {
            trabajaderaId: trabajaderasCreadas[1]?.id ?? "",
            costaleros: [C4, C5, C6],
            carga: 5,
          },
        ],
      },
      repos,
    );
    await fijarBoquillas({ pasoId, boquillas: [C1, C4] }, repos);
    await guardarTramos(
      { pasoId, nombres: ["Salida", "Plaza", "Entrada"] },
      repos,
    );

    // "Recarga": se lee del almacén como lo hace la pantalla.
    const paso = almacen.pasos.find((candidate) => candidate.id === pasoId);
    expect(paso?.name).toBe("Cristo de la Salud");
    expect(paso?.season).toBe(2025);
    expect(paso?.num_trabajaderas).toBe(2);

    const pools = almacen.trabajaderas
      .filter((trabajadera) => trabajadera.paso_id === pasoId)
      .map((trabajadera) =>
        almacen.asignaciones
          .filter((asignacion) => asignacion.trabajadera_id === trabajadera.id)
          .map((asignacion) => asignacion.costalero_id)
          .sort(),
      );
    expect(pools).toHaveLength(2);
    expect(pools[0]).toEqual([C1, C2, C3].sort());
    expect(pools[1]).toEqual([C4, C5, C6].sort());

    expect(
      almacen.asignaciones
        .filter((asignacion) => asignacion.is_boquilla)
        .map((asignacion) => asignacion.costalero_id)
        .sort(),
    ).toEqual([C1, C4].sort());

    const tramos = almacen.tramos
      .filter((tramo) => tramo.paso_id === pasoId)
      .sort((a, b) => a.ordinal - b.ordinal);
    expect(tramos.map((tramo) => tramo.name)).toEqual([
      "Salida",
      "Plaza",
      "Entrada",
    ]);
    expect(tramos.map((tramo) => tramo.kind)).toEqual([
      "salida",
      "normal",
      "entrada",
    ]);
  });

  it("al cambiar el nº de trabajaderas se crean las que faltan, se borran las que sobran y se avisa de los puestos sin cubrir", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    const resultado = await guardarDatosPaso(
      {
        pasoId: PASO_ID,
        nombre: "Paso de prueba",
        anio: 2025,
        numTrabajaderas: 4,
      },
      repos,
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(almacen.trabajaderas).toHaveLength(4);
    expect(almacen.trabajaderas.map((w) => w.position).sort()).toEqual([
      1, 2, 3, 4,
    ]);
    expect(resultado.mensaje).toContain("sin cubrir");

    const reduccion = await guardarDatosPaso(
      {
        pasoId: PASO_ID,
        nombre: "Paso de prueba",
        anio: 2025,
        numTrabajaderas: 2,
      },
      repos,
    );
    expect(reduccion.ok).toBe(true);
    expect(almacen.trabajaderas).toHaveLength(2);
    if (!reduccion.ok) return;
    expect(reduccion.mensaje).toContain("Se han eliminado 2 trabajaderas");
  });

  it("guarda los tramos propuestos: el primero es la salida y el último la entrada", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    const resultado = await guardarTramos(
      { pasoId: PASO_ID, nombres: ["Salida", "Plaza", "Entrada"] },
      repos,
    );

    expect(resultado.ok).toBe(true);
    expect(almacen.tramos).toHaveLength(3);
    expect(almacen.tramos.map((tramo) => tramo.kind)).toEqual([
      "salida",
      "normal",
      "entrada",
    ]);
    expect(almacen.tramos.map((tramo) => tramo.ordinal)).toEqual([1, 2, 3]);
  });

  it("no borra los tramos que quedan fuera de la propuesta", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    await guardarTramos(
      { pasoId: PASO_ID, nombres: ["Salida", "Plaza", "Entrada"] },
      repos,
    );
    const resultado = await guardarTramos(
      { pasoId: PASO_ID, nombres: ["Salida"] },
      repos,
    );

    expect(resultado.ok).toBe(true);
    expect(almacen.tramos).toHaveLength(3);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain("no se borran");
  });

  it("rechaza un costalero que no es de la cuadrilla sin persistir nada", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    const resultado = await guardarReparto(
      {
        pasoId: PASO_ID,
        reparto: [
          {
            trabajaderaId: T1,
            costaleros: ["77777777-7777-4777-8777-777777777777"],
            carga: 5,
          },
        ],
      },
      repos,
    );

    expect(resultado.ok).toBe(false);
    expect(almacen.asignaciones).toHaveLength(0);
  });

  it("una trabajadera que no es del paso se rechaza", async () => {
    const almacen = crearAlmacen();
    const repos = crearRepositorios(almacen);

    const resultado = await guardarReparto(
      {
        pasoId: PASO_ID,
        reparto: [
          {
            trabajaderaId: "88888888-8888-4888-8888-888888888888",
            costaleros: [C1],
            carga: 5,
          },
        ],
      },
      repos,
    );

    expect(resultado.ok).toBe(false);
    expect(almacen.asignaciones).toHaveLength(0);
  });
});

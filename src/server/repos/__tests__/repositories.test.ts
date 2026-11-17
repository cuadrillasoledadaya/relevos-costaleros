import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { CuadrillaInput } from "../../../lib/schemas";
import { crearRepositorioAsignaciones } from "../asignaciones";
import { crearRepositorioCostaleros } from "../costaleros";
import { crearRepositorioCuadrillas } from "../cuadrillas";
import { crearRepositorioPasos } from "../pasos";
import { crearRepositorioPlanes } from "../planes";
import { crearRepositorioRelevos } from "../relevos";
import { crearRepositorioTramos } from "../tramos";
import { crearRepositorioTrabajaderas } from "../trabajaderas";
import { IDS } from "./fixtures";
import { crearPgliteDePrueba, establecerActor } from "./pglite";
import { crearClientePglite } from "./pglite-client";

describe("repositorios tipados", () => {
  let db: PGlite;
  let client: ReturnType<typeof crearClientePglite>;

  beforeEach(async () => {
    db = await crearPgliteDePrueba();
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, 'capataz@example.test', '{}'::jsonb)`,
      [IDS.capatazA],
    );
    await db.query(
      `insert into profiles (id, full_name, role)
       values ($1, 'Capataz', 'capataz')`,
      [IDS.capatazA],
    );
    await establecerActor(db, "authenticated", IDS.capatazA);
    client = crearClientePglite(db);
  }, 30_000);

  afterEach(async () => {
    await db?.close();
  });

  it("persiste y consulta cuadrillas y costaleros", async () => {
    const cuadrillas = crearRepositorioCuadrillas(client);
    const costo = await cuadrillas.crear({
      name: "Cuadrilla",
      season: 2025,
      owner_id: IDS.capatazA,
    });

    expect(costo.error).toBeNull();
    expect(costo.data?.name).toBe("Cuadrilla");
    const cuadrillaId = costo.data?.id;
    expect(cuadrillaId).toBeDefined();

    const costaleros = crearRepositorioCostaleros(client);
    const creado = await costaleros.crear({
      cuadrilla_id: cuadrillaId as string,
      full_name: "Costalero",
    });
    expect(creado.error).toBeNull();
    expect(creado.data?.active).toBe(true);

    const listado = await costaleros.listarPorCuadrilla(cuadrillaId as string);
    expect(listado.error).toBeNull();
    expect(listado.data).toHaveLength(1);
    expect(listado.data?.[0]?.full_name).toBe("Costalero");
  });

  it("rechaza una entrada inválida sin cambiar los datos persistidos", async () => {
    const cuadrillas = crearRepositorioCuadrillas(client);
    const antes = await db.query<{ total: string }>(
      `select count(*)::text as total from cuadrillas`,
    );

    const rechazado = await cuadrillas.crear({
      name: "",
      season: 2025,
      owner_id: IDS.capatazA,
    } as CuadrillaInput);

    expect(rechazado.data).toBeNull();
    expect(rechazado.error?.code).toBe("VALIDATION_ERROR");

    const despues = await db.query<{ total: string }>(
      `select count(*)::text as total from cuadrillas`,
    );
    expect(despues.rows).toEqual(antes.rows);
  });

  it("persiste y consulta pasos, trabajaderas, asignaciones y tramos", async () => {
    const cuadrillaId = await crearCuadrilla();
    const pasos = crearRepositorioPasos(client);
    const paso = await pasos.crear({
      cuadrilla_id: cuadrillaId,
      name: "Paso",
      season: 2025,
      num_trabajaderas: 1,
    });
    expect(paso.error).toBeNull();
    const pasoId = paso.data?.id as string;

    const trabajaderas = crearRepositorioTrabajaderas(client);
    const trabajadera = await trabajaderas.crear({
      paso_id: pasoId,
      position: 1,
      carga: 5,
    });
    expect(trabajadera.error).toBeNull();
    const trabajaderaId = trabajadera.data?.id as string;

    const costaleros = crearRepositorioCostaleros(client);
    const costalero = await costaleros.crear({
      cuadrilla_id: cuadrillaId,
      full_name: "Suplente",
    });
    const costaleroId = costalero.data?.id as string;

    const asignaciones = crearRepositorioAsignaciones(client);
    const asignacion = await asignaciones.crear({
      trabajadera_id: trabajaderaId,
      costalero_id: costaleroId,
      is_boquilla: true,
    });
    expect(asignacion.error).toBeNull();
    expect(asignacion.data?.is_boquilla).toBe(true);

    const tramos = crearRepositorioTramos(client);
    const tramo = await tramos.crear({
      paso_id: pasoId,
      name: "Salida",
      ordinal: 1,
      kind: "salida",
    });
    expect(tramo.error).toBeNull();
    expect(tramo.data?.kind).toBe("salida");
  });

  it("persiste y consulta planes y relevos", async () => {
    const cuadrillaId = await crearCuadrilla();
    const pasos = crearRepositorioPasos(client);
    const paso = await pasos.crear({
      cuadrilla_id: cuadrillaId,
      name: "Paso",
      season: 2025,
      num_trabajaderas: 1,
    });
    const pasoId = paso.data?.id as string;

    const tramos = crearRepositorioTramos(client);
    const tramo = await tramos.crear({
      paso_id: pasoId,
      name: "Salida",
      ordinal: 1,
    });
    const tramoId = tramo.data?.id as string;

    const costaleros = crearRepositorioCostaleros(client);
    const costalero = await costaleros.crear({
      cuadrilla_id: cuadrillaId,
      full_name: "Costalero",
    });
    const costaleroId = costalero.data?.id as string;

    const planes = crearRepositorioPlanes(client);
    const plan = await planes.crear({
      paso_id: pasoId,
      version: 1,
      seed: 20250330,
      solver_version: "1.0.0",
      created_by: IDS.capatazA,
    });
    expect(plan.error).toBeNull();
    const planId = plan.data?.id as string;

    const relevos = crearRepositorioRelevos(client);
    const relevo = await relevos.crear({
      plan_id: planId,
      tramo_id: tramoId,
      costalero_id: costaleroId,
      estado: "descanso",
    });
    expect(relevo.error).toBeNull();
    expect(relevo.data?.estado).toBe("descanso");

    const listados = await relevos.listarPorPlan(planId);
    expect(listados.error).toBeNull();
    expect(listados.data).toHaveLength(1);
  });

  async function crearCuadrilla(): Promise<string> {
    const cuadrillas = crearRepositorioCuadrillas(client);
    const creada = await cuadrillas.crear({
      name: "Cuadrilla",
      season: 2025,
      owner_id: IDS.capatazA,
    });
    expect(creada.error).toBeNull();
    return creada.data?.id as string;
  }
});

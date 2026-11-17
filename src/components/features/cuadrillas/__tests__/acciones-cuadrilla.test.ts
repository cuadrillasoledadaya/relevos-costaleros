import { describe, expect, it, vi } from "vitest";
import {
  ejecutarCerrarSesion,
  ejecutarCrearCuentaCostalero,
} from "@/server/actions/costalero";
import {
  ejecutarCrearCuadrilla,
  ejecutarCrearCostalero,
} from "@/server/actions/cuadrilla";

describe("acciones de cuadrilla", () => {
  it("rechaza una cuadrilla vacía sin llamar a la persistencia", async () => {
    const crear = vi.fn();

    const resultado = await ejecutarCrearCuadrilla(
      { name: "", season: 2025, notes: null },
      { usuarioActualId: "10000000-0000-4000-8000-000000000001", crear },
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.errores?.name).toBeTruthy();
    expect(crear).not.toHaveBeenCalled();
  });
});

describe("acciones de costalero", () => {
  it("rechaza el mismo correo en dos cuadrillas y no crea una segunda fila", async () => {
    const filas: Array<{ id: string; cuadrilla_id: string }> = [];
    const crear = vi.fn(async (entrada: { cuadrilla_id: string }) => {
      const fila = { id: `fila-${filas.length + 1}`, ...entrada };
      filas.push(fila);
      return { id: fila.id };
    });
    const dependencias = {
      usuarioActualId: "10000000-0000-4000-8000-000000000001",
      esCapatazDeCuadrilla: vi.fn(async () => true),
      resolverPerfilPorEmail: vi.fn(
        async () => "40000000-0000-4000-8000-000000000001",
      ),
      buscarCostaleroPorPerfil: vi.fn(async () => filas[0] ?? null),
    };

    const primero = await ejecutarCrearCostalero(
      {
        cuadrillaId: "20000000-0000-4000-8000-000000000001",
        full_name: "Ana García",
        nickname: null,
        phone: null,
        notes: null,
        email: "ana@example.test",
      },
      { ...dependencias, crear },
    );
    const segundo = await ejecutarCrearCostalero(
      {
        cuadrillaId: "20000000-0000-4000-8000-000000000002",
        full_name: "Ana García",
        nickname: null,
        phone: null,
        notes: null,
        email: "ana@example.test",
      },
      { ...dependencias, crear },
    );

    expect(primero.ok).toBe(true);
    expect(segundo.ok).toBe(false);
    expect(segundo.mensaje).toContain("otra cuadrilla");
    expect(filas).toHaveLength(1);
    expect(crear).toHaveBeenCalledTimes(1);
  });

  it("permite dar de alta un costalero sin cuenta", async () => {
    const crear = vi.fn(async () => ({ id: "fila-1" }));

    const resultado = await ejecutarCrearCostalero(
      {
        cuadrillaId: "20000000-0000-4000-8000-000000000001",
        full_name: "Persona sin cuenta",
        nickname: null,
        phone: null,
        notes: null,
        email: null,
      },
      {
        usuarioActualId: "10000000-0000-4000-8000-000000000001",
        esCapatazDeCuadrilla: async () => true,
        resolverPerfilPorEmail: async () => null,
        buscarCostaleroPorPerfil: async () => null,
        crear,
      },
    );

    expect(resultado.ok).toBe(true);
    expect(crear).toHaveBeenCalledTimes(1);
  });

  it("traduce el rechazo del indice unico a un mensaje en espanol", async () => {
    const crear = vi.fn(async () => ({
      id: "",
      error:
        'duplicate key value violates unique constraint "costaleros_profile_id_unico"',
      codigo: "23505",
    }));

    const resultado = await ejecutarCrearCostalero(
      {
        cuadrillaId: "20000000-0000-4000-8000-000000000001",
        full_name: "Ana García",
        nickname: null,
        phone: null,
        notes: null,
        email: "ana@example.test",
      },
      {
        usuarioActualId: "10000000-0000-4000-8000-000000000001",
        esCapatazDeCuadrilla: async () => true,
        resolverPerfilPorEmail: async () =>
          "40000000-0000-4000-8000-000000000001",
        buscarCostaleroPorPerfil: async () => null,
        crear,
      },
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toContain("otra cuadrilla");
    expect(resultado.mensaje).not.toContain("duplicate key");
  });
});

describe("alta de cuenta de costalero", () => {
  it("crea el perfil con rol costalero por defecto", async () => {
    const crearPerfil = vi.fn(async () => ({}));

    const resultado = await ejecutarCrearCuentaCostalero(
      {
        full_name: "Ana García",
        email: "ana@example.test",
        password: "contraseña-larga",
      },
      {
        buscarUsuarioPorEmail: async () => null,
        registrarUsuario: async () => ({ userId: "usuario-1" }),
        crearPerfil,
      },
    );

    expect(resultado.ok).toBe(true);
    expect(crearPerfil).toHaveBeenCalledWith(
      "usuario-1",
      "Ana García",
      "costalero",
    );
  });

  it("no registra un correo que ya existe", async () => {
    const registrarUsuario = vi.fn();

    const resultado = await ejecutarCrearCuentaCostalero(
      {
        full_name: "Ana García",
        email: "ana@example.test",
        password: "contraseña-larga",
      },
      {
        buscarUsuarioPorEmail: async () => ({ id: "usuario-1" }),
        registrarUsuario,
        crearPerfil: async () => ({}),
      },
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toBe("Ese correo ya está registrado.");
    expect(registrarUsuario).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("cierra la sesión antes de redirigir", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const redirigir = vi.fn();

    const resultado = await ejecutarCerrarSesion({ signOut, redirigir });

    expect(resultado.ok).toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(redirigir).toHaveBeenCalledWith("/login");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { updateSession } = vi.hoisted(() => ({
  updateSession: vi.fn(),
}));

vi.mock("@/server/supabase/middleware", () => ({ updateSession }));

import middleware from "@/middleware";

function peticion(ruta: string): NextRequest {
  return new NextRequest(`https://relevos.test${ruta}`);
}

describe("middleware de sesión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refresca la sesión y deja pasar una ruta protegida con usuario", async () => {
    updateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { id: "usuario-1" },
    });

    const respuesta = await middleware(peticion("/cuadrillas"));

    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(respuesta.status).toBe(200);
  });

  it("redirige a /login cuando una ruta protegida no tiene sesión", async () => {
    updateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: null,
    });

    const respuesta = await middleware(peticion("/cuadrillas"));

    expect(respuesta.status).toBe(307);
    expect(respuesta.headers.get("location")).toContain("/login");
  });

  it("deja accesible /login y redirige al usuario que ya tiene sesión", async () => {
    updateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { id: "usuario-1" },
    });

    const respuesta = await middleware(peticion("/login"));

    expect(respuesta.status).toBe(307);
    expect(respuesta.headers.get("location")).toContain("/cuadrillas");
  });
});

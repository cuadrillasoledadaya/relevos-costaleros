import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { cargarSesion } = vi.hoisted(() => ({ cargarSesion: vi.fn() }));
const { crearCliente } = vi.hoisted(() => ({ crearCliente: vi.fn() }));

vi.mock("@/components/features/cuadrillas/sesion", () => ({
  cargarSesion,
}));

vi.mock("@/server/supabase/server", () => ({
  createServerSupabaseClient: crearCliente,
}));

import LoadingTramos from "@/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/tramos/loading";
import PageTramos from "@/app/(app)/cuadrillas/[cuadrillaId]/paso/[pasoId]/tramos/page";

const CUADRILLA_ID = "20000000-0000-4000-8000-000000000001";
const PASO_ID = "30000000-0000-4000-8000-000000000001";

/**
 * VERIFICACIÓN PROPIA del bloqueante 3: un costalero ve el estado «Sin
 * permisos» y la pantalla no consulta ningún dato; y la carpeta declara el
 * esqueleto de carga.
 */
describe("bloqueante 3 · estados obligatorios de P4", () => {
  it("un costalero ve «Sin permisos» y no se consulta ningún dato", async () => {
    cargarSesion.mockResolvedValue({
      user: { id: "40000000-0000-4000-8000-000000000001" },
      perfil: {
        id: "40000000-0000-4000-8000-000000000001",
        full_name: "Costalero A",
        role: "costalero",
      },
      costalero: null,
    });

    render(
      await PageTramos({
        params: Promise.resolve({
          cuadrillaId: CUADRILLA_ID,
          pasoId: PASO_ID,
        }),
      }),
    );

    expect(screen.getByText("Sin permisos")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Sin permisos");
    // La pantalla no llega a pedir los datos del paso.
    expect(crearCliente).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Apartado de tramos" }),
    ).not.toBeInTheDocument();
  });

  it("el esqueleto de carga se declara y se renderiza", () => {
    const { container } = render(<LoadingTramos />);

    const contenedor = container.querySelector('[aria-busy="true"]');
    expect(contenedor).not.toBeNull();
    const esqueletos = contenedor?.querySelectorAll('[aria-hidden="true"]');
    expect(esqueletos?.length).toBeGreaterThan(0);
  });
});

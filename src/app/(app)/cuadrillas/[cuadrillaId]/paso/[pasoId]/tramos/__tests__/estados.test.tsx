import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { cargarSesion } = vi.hoisted(() => ({
  cargarSesion: vi.fn(),
}));

vi.mock("@/components/features/cuadrillas/sesion", () => ({
  cargarSesion,
}));

vi.mock("@/server/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => {
    throw new Error("La pantalla no debe consultar datos sin permisos.");
  }),
}));

import PageTramos from "../page";
import LoadingTramos from "../loading";

const CUADRILLA_ID = "11111111-1111-4111-8111-111111111111";
const PASO_ID = "22222222-2222-4222-8222-222222222222";

describe("P4 · estados obligatorios", () => {
  it("muestra el estado sin permisos a una sesión de costalero", async () => {
    cargarSesion.mockResolvedValue({
      user: { id: "33333333-3333-4333-8333-333333333333" },
      perfil: {
        id: "33333333-3333-4333-8333-333333333333",
        full_name: "Costalero",
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

    expect(screen.getByRole("alert")).toHaveTextContent("Sin permisos");
    expect(
      screen.queryByRole("heading", { name: "Apartado de tramos" }),
    ).not.toBeInTheDocument();
  });

  it("declara un skeleton de carga para la carpeta", () => {
    const { container } = render(<LoadingTramos />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(
      container.querySelectorAll('[aria-hidden="true"]').length,
    ).toBeGreaterThan(0);
  });
});

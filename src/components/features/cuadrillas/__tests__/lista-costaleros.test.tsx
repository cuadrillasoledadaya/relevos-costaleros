import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListaCostaleros, type CostaleroResumen } from "../ListaCostaleros";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const COSTALERO: CostaleroResumen = {
  id: "fila-1",
  full_name: "Ana García",
  nickname: "Ana",
  phone: "600 000 000",
  notes: "Suplente",
  profile_id: "perfil-1",
  active: true,
};

describe("ListaCostaleros", () => {
  it("muestra un estado vacío con CTA y no una tabla vacía", () => {
    const onCrear = vi.fn();

    render(
      <ListaCostaleros
        costaleros={[]}
        onCrear={onCrear}
        onEditar={vi.fn()}
        accionEliminar={vi.fn()}
      />,
    );

    expect(screen.getByText("Todavía no hay costaleros")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Añadir costalero" }));
    expect(onCrear).toHaveBeenCalledTimes(1);
  });

  it("lista los datos de alta y permite editar y eliminar", () => {
    const onEditar = vi.fn();
    const accionEliminar = vi.fn();

    render(
      <ListaCostaleros
        costaleros={[COSTALERO]}
        onCrear={vi.fn()}
        onEditar={onEditar}
        accionEliminar={accionEliminar}
      />,
    );

    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar Ana García" }));
    expect(onEditar).toHaveBeenCalledWith(COSTALERO);
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar Ana García" }),
    );
    expect(accionEliminar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(accionEliminar).toHaveBeenCalledWith("fila-1");
  });
});

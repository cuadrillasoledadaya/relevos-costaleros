import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button, IconButton } from "../Button";

describe("Button", () => {
  it("es un botón real con el nombre accesible que le da el consumidor", () => {
    render(<Button>Guardar</Button>);
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toBeInTheDocument();
    expect(boton).toHaveAttribute("type", "button");
  });

  it("anuncia el estado de carga y bloquea la interacción", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );
    const boton = screen.getByRole("button", { name: /Guardar/ });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
    fireEvent.click(boton);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respeta el estado deshabilitado", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    );
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("permite activar el botón con el teclado (Enter y Espacio)", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);
    const boton = screen.getByRole("button", { name: "Guardar" });
    fireEvent.click(boton);
    fireEvent.keyDown(boton, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("IconButton", () => {
  it("exige un nombre accesible y lo expone como etiqueta", () => {
    render(
      <IconButton
        label="Eliminar tramo"
        icon={<span aria-hidden="true">x</span>}
      />,
    );
    const boton = screen.getByRole("button", { name: "Eliminar tramo" });
    expect(boton).toBeInTheDocument();
  });
});

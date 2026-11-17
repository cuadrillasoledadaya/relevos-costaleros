import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormField } from "../FormField";
import { Input } from "../Input";
import { Textarea } from "../Textarea";

describe("FormField", () => {
  it("asocia la etiqueta al control y expone la ayuda y el error", () => {
    render(
      <FormField id="nombre" label="Nombre del tramo" helper="Texto libre">
        <Input id="nombre" />
      </FormField>,
    );
    const campo = screen.getByLabelText("Nombre del tramo");
    expect(campo).toBeInTheDocument();
    expect(campo).toHaveAccessibleDescription("Texto libre");
    expect(campo).not.toHaveAttribute("aria-invalid", "true");
  });

  it("marca el control como inválido y anuncia el error", () => {
    render(
      <FormField
        id="nombre"
        label="Nombre del tramo"
        error="El nombre del tramo es obligatorio"
      >
        <Input id="nombre" />
      </FormField>,
    );
    const campo = screen.getByLabelText("Nombre del tramo");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription(
      "El nombre del tramo es obligatorio",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El nombre del tramo es obligatorio",
    );
  });

  it("funciona igual con un textarea", () => {
    render(
      <FormField id="notas" label="Notas" error="Demasiado largo">
        <Textarea id="notas" />
      </FormField>,
    );
    const campo = screen.getByLabelText("Notas");
    expect(campo).toHaveAttribute("aria-invalid", "true");
  });

  it("inyecta el identificador del campo en el control si no viene", () => {
    render(
      <FormField id="anio" label="Año">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText("Año")).toHaveAttribute("id", "anio");
  });
});

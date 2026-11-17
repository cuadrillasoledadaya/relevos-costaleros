import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Dialog } from "../Dialog";

function Escenario() {
  const [abierto, setAbierto] = useState(true);
  return (
    <>
      <button type="button">Fuera</button>
      <Dialog
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Confirmar el borrado"
        description="Esta acción no se puede deshacer."
      >
        <button type="button">Confirmar</button>
        <button type="button">Cancelar</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("se expone como diálogo modal con título y descripción", () => {
    render(<Escenario />);
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleName("Confirmar el borrado");
    expect(dialogo).toHaveAccessibleDescription(
      "Esta acción no se puede deshacer.",
    );
  });

  it("mueve el foco dentro del diálogo al abrirlo", () => {
    render(<Escenario />);
    const dialogo = screen.getByRole("dialog");
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it("cierra con la tecla Escape", () => {
    render(<Escenario />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mantiene el foco dentro del diálogo al tabular", () => {
    render(<Escenario />);
    const dialogo = screen.getByRole("dialog");
    const botones = Array.from(dialogo.querySelectorAll("button"));
    const primero = botones[0];
    const ultimo = botones[botones.length - 1];
    expect(ultimo).toBeDefined();
    (ultimo as HTMLButtonElement).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(primero).toBeDefined();
  });

  it("devuelve el foco al elemento que lo abrió al cerrar", () => {
    function ConCierre() {
      const [abierto, setAbierto] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setAbierto(true)}>
            Abrir
          </button>
          <Dialog
            open={abierto}
            onClose={() => setAbierto(false)}
            title="Título"
          >
            <button type="button">Dentro</button>
          </Dialog>
        </>
      );
    }
    render(<ConCierre />);
    const disparador = screen.getByRole("button", { name: "Abrir" });
    disparador.focus();
    fireEvent.click(disparador);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(disparador);
  });
});

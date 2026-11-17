import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BotonInstalar } from "../BotonInstalar";

type EventoInstalar = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function dispararBeforeInstallPrompt() {
  const evento = new Event("beforeinstallprompt") as EventoInstalar;
  evento.prompt = () => {};
  evento.userChoice = Promise.resolve({ outcome: "accepted" });
  act(() => {
    window.dispatchEvent(evento);
  });
  return evento;
}

function definirUserAgent(valor: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: valor,
    configurable: true,
  });
}

describe("BotonInstalar", () => {
  afterEach(() => {
    definirUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    );
  });

  it("captura el evento beforeinstallprompt y ofrece instalar la app", () => {
    render(<BotonInstalar />);
    dispararBeforeInstallPrompt();
    expect(
      screen.getByRole("button", { name: /Instalar app/ }),
    ).toBeInTheDocument();
  });

  it("muestra la instrucción de iOS cuando no hay evento de instalación", () => {
    definirUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    render(<BotonInstalar />);
    expect(screen.getByText(/Compartir/)).toBeInTheDocument();
    expect(screen.getByText(/Añadir a pantalla de inicio/)).toBeInTheDocument();
  });

  it("invoca el diálogo de instalación del navegador", () => {
    render(<BotonInstalar />);
    let invocado = false;
    const evento = new Event("beforeinstallprompt") as EventoInstalar;
    evento.prompt = () => {
      invocado = true;
    };
    evento.userChoice = Promise.resolve({ outcome: "accepted" });
    act(() => {
      window.dispatchEvent(evento);
    });
    fireEvent.click(screen.getByRole("button", { name: /Instalar app/ }));
    expect(invocado).toBe(true);
  });
});

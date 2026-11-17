import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createBrowserSupabaseClient, push } = vi.hoisted(() => ({
  createBrowserSupabaseClient: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/server/supabase/browser", () => ({ createBrowserSupabaseClient }));
vi.mock("next/navigation", () => ({
  push,
  refresh: vi.fn(),
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

import { FormularioAcceso, FormularioAltaCuenta } from "../FormularioAcceso";
import { mensajeErrorAcceso } from "../errores";

function clienteAuth(sobrescrito: Record<string, unknown> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: "usuario-1" }, session: null },
        error: null,
      }),
      signInWithOtp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      ...sobrescrito,
    },
  };
}

describe("mensajes de acceso", () => {
  it("explica en español un correo no registrado o una contraseña incorrecta", () => {
    expect(
      mensajeErrorAcceso({
        message: "Invalid login credentials",
        code: "invalid_credentials",
      }),
    ).toBe("Ese correo no está registrado o la contraseña es incorrecta.");
  });

  it("traduce un correo ya registrado", () => {
    expect(
      mensajeErrorAcceso({
        message: "User already registered",
        code: "user_already_exists",
      }),
    ).toBe("Ese correo ya está registrado.");
  });
});

describe("FormularioAcceso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia sesión con correo y contraseña y continúa a /cuadrillas", async () => {
    const cliente = clienteAuth();
    createBrowserSupabaseClient.mockResolvedValue(cliente);

    render(<FormularioAcceso accionCrearCuenta={vi.fn()} />);

    fireEvent.change(
      screen.getByLabelText(/Correo electrónico/, { selector: "#correo" }),
      { target: { value: "persona@example.test" } },
    );
    fireEvent.change(
      screen.getByLabelText(/Contraseña/, { selector: "#password" }),
      {
        target: { value: "contraseña-larga" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(cliente.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "persona@example.test",
        password: "contraseña-larga",
      });
    });
    expect(push).toHaveBeenCalledWith("/cuadrillas");
  });

  it("muestra un error accionable si Supabase rechaza el acceso", async () => {
    const cliente = clienteAuth({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      }),
    });
    createBrowserSupabaseClient.mockResolvedValue(cliente);

    render(<FormularioAcceso accionCrearCuenta={vi.fn()} />);
    fireEvent.change(
      screen.getByLabelText(/Correo electrónico/, { selector: "#correo" }),
      { target: { value: "persona@example.test" } },
    );
    fireEvent.change(
      screen.getByLabelText(/Contraseña/, { selector: "#password" }),
      {
        target: { value: "incorrecta" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText(
        "Ese correo no está registrado o la contraseña es incorrecta.",
      ),
    ).toBeInTheDocument();
  });

  it("envía un enlace mágico y confirma que está en camino", async () => {
    const cliente = clienteAuth();
    createBrowserSupabaseClient.mockResolvedValue(cliente);

    render(<FormularioAcceso accionCrearCuenta={vi.fn()} />);
    fireEvent.change(
      screen.getByLabelText(/Correo electrónico/, { selector: "#correo" }),
      { target: { value: "persona@example.test" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enviar enlace mágico" }),
    );

    await waitFor(() => {
      expect(cliente.auth.signInWithOtp).toHaveBeenCalledWith({
        email: "persona@example.test",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("/cuadrillas"),
        }),
      });
    });
    expect(await screen.findByText(/enlace.*correo/i)).toBeInTheDocument();
  });

  it("reutiliza el botón de instalar y muestra la guía de iOS", () => {
    createBrowserSupabaseClient.mockResolvedValue(clienteAuth());

    render(<FormularioAcceso accionCrearCuenta={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /Instalar app/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Compartir/)).toBeInTheDocument();
    expect(screen.getByText(/Añadir a pantalla de inicio/)).toBeInTheDocument();
  });
});

describe("FormularioAltaCuenta", () => {
  it("solicita nombre, correo y contraseña para crear una cuenta de costalero", async () => {
    const accion = vi
      .fn()
      .mockResolvedValue({ ok: true, mensaje: "Cuenta creada correctamente." });
    createBrowserSupabaseClient.mockResolvedValue(clienteAuth());

    render(<FormularioAltaCuenta accion={accion} />);

    fireEvent.change(
      screen.getByLabelText(/Nombre completo/, { selector: "#full_name" }),
      { target: { value: "Ana García" } },
    );
    fireEvent.change(
      screen.getByLabelText(/Correo electrónico/, {
        selector: "#email-cuenta",
      }),
      { target: { value: "ana@example.test" } },
    );
    fireEvent.change(
      screen.getByLabelText(/Contraseña/, { selector: "#password-cuenta" }),
      { target: { value: "contraseña-larga" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(accion).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false }),
        expect.any(FormData),
      );
    });
    const [, formData] = accion.mock.calls[0] ?? [];
    expect(formData?.get("full_name")).toBe("Ana García");
    expect(formData?.get("email")).toBe("ana@example.test");
    expect(formData?.get("password")).toBe("contraseña-larga");
    expect(
      await screen.findByText("Cuenta creada correctamente."),
    ).toBeInTheDocument();
  });
});

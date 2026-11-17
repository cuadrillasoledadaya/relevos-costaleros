"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { BotonInstalar } from "@/components/shell";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from "@/components/ui";
import { createBrowserSupabaseClient } from "@/server/supabase/browser";
import type { EstadoAccion } from "@/server/actions/cuadrilla";

import { mensajeErrorAcceso } from "./errores";

type AccionCuenta = (
  estado: EstadoAccion,
  formData: FormData,
) => Promise<EstadoAccion>;

type ClienteAuthAmpliado = {
  auth: {
    signInWithPassword(entrada: { email: string; password: string }): Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
    signInWithOtp(entrada: {
      email: string;
      options: { emailRedirectTo: string };
    }): Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
};

export type FormularioAccesoProps = {
  accionCrearCuenta: AccionCuenta;
};

export function FormularioAcceso({ accionCrearCuenta }: FormularioAccesoProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      const cliente = await clienteAuth();
      const { error: errorAcceso } = await cliente.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (errorAcceso) {
        setError(mensajeErrorAcceso(errorAcceso));
        return;
      }
      router.push("/cuadrillas");
      router.refresh();
    } catch (problema) {
      setError(mensajeErrorAcceso(problema));
    } finally {
      setCargando(false);
    }
  }

  async function enviarEnlace() {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      const cliente = await clienteAuth();
      const { error: errorAcceso } = await cliente.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/cuadrillas`,
        },
      });
      if (errorAcceso) {
        setError(mensajeErrorAcceso(errorAcceso));
        return;
      }
      setAviso(
        "Te hemos enviado un enlace al correo. Ábrelo para entrar sin contraseña.",
      );
    } catch (problema) {
      setError(mensajeErrorAcceso(problema));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <p className="text-pequeno text-fg-muted">
            Usa tu correo y tu contraseña o pide un enlace mágico.
          </p>
        </CardHeader>
        <CardBody>
          <form
            className="grid gap-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              void entrar();
            }}
          >
            <FormField id="correo" label="Correo electrónico" required>
              <Input
                id="correo"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                required
              />
            </FormField>
            <FormField id="password" label="Contraseña" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                required
              />
            </FormField>

            {error ? <Alert tone="danger">{error}</Alert> : null}
            {aviso ? <Alert tone="success">{aviso}</Alert> : null}

            <Button
              type="submit"
              fullWidth
              loading={cargando}
              loadingText="Entrando…"
            >
              Entrar
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={cargando || email.trim() === ""}
              onClick={() => void enviarEnlace()}
            >
              Enviar enlace mágico
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instalar la app</CardTitle>
          <p className="text-pequeno text-fg-muted">
            Instálala para abrirla rápido, aunque alguna vez falle la conexión.
          </p>
        </CardHeader>
        <CardBody className="gap-3">
          <BotonInstalar />
          <p className="text-pequeno text-fg-muted">
            En iOS, pulsa <strong>Compartir</strong> y luego{" "}
            <strong>Añadir a pantalla de inicio</strong>.
          </p>
        </CardBody>
      </Card>

      <FormularioAltaCuenta accion={accionCrearCuenta} />
    </div>
  );
}

export type FormularioAltaCuentaProps = {
  accion: AccionCuenta;
};

export function FormularioAltaCuenta({ accion }: FormularioAltaCuentaProps) {
  const [estado, enviar, pendiente] = useActionState(accion, {
    ok: false,
  } satisfies EstadoAccion);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta de costalero</CardTitle>
        <p className="text-pequeno text-fg-muted">
          Las cuentas nuevas son de costalero. Un capataz te vinculará a su
          cuadrilla.
        </p>
      </CardHeader>
      <CardBody>
        <form action={enviar} className="grid gap-4">
          <FormField id="full_name" label="Nombre completo" required>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              required
            />
          </FormField>
          <FormField id="email-cuenta" label="Correo electrónico" required>
            <Input
              id="email-cuenta"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </FormField>
          <FormField
            id="password-cuenta"
            label="Contraseña"
            helper="Usa al menos 8 caracteres."
            required
          >
            <Input
              id="password-cuenta"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </FormField>

          {estado.mensaje ? (
            <Alert tone={estado.ok ? "success" : "danger"}>
              {estado.mensaje}
            </Alert>
          ) : null}

          <Button type="submit" fullWidth loading={pendiente}>
            Crear cuenta
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

async function clienteAuth(): Promise<ClienteAuthAmpliado> {
  const cliente = await createBrowserSupabaseClient();
  return cliente as unknown as ClienteAuthAmpliado;
}

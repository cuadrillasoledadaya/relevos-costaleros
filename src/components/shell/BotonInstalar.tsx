"use client";

import { useEffect, useState } from "react";

import { Button } from "../ui/Button";
import { Icono } from "../ui/Icono";
import { cn } from "../ui/types";

/** Evento `beforeinstallprompt` de Chromium. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void> | void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type BotonInstalarProps = {
  /** Etiqueta del botón. */
  label?: string;
  className?: string;
};

function esNavegadorIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const agente = navigator.userAgent;
  const esIOS = /iPad|iPhone|iPod/.test(agente);
  // Los iPad modernos se anuncian como Mac: se differentiate por el táctil.
  const esIPadOS =
    /Macintosh/.test(agente) &&
    typeof document !== "undefined" &&
    "ontouchend" in document;
  return esIOS || esIPadOS;
}

/**
 * Botón de instalación de la PWA.
 *
 * Captura el evento `beforeinstallprompt` (Chromium/Android) y, cuando el
 * navegador no lo emite —iOS Safari—, muestra la instrucción manual
 * «Compartir → Añadir a pantalla de inicio».
 */
export function BotonInstalar({
  label = "Instalar app",
  className,
}: BotonInstalarProps) {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setEsIOS(esNavegadorIOS());

    const onBeforeInstallPrompt = (eventoRecibido: Event) => {
      eventoRecibido.preventDefault();
      setEvento(eventoRecibido as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalada(true);
      setEvento(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (instalada) return null;

  if (esIOS && !evento) {
    return (
      <p className={cn("text-pequeno text-fg-muted", className)}>
        Instálala en el móvil: pulsa{" "}
        <span className="font-medium text-fg">Compartir</span> y luego{" "}
        <span className="font-medium text-fg">Añadir a pantalla de inicio</span>
        .
      </p>
    );
  }

  const instalar = async () => {
    if (!evento) {
      setAviso("Abre el menú del navegador y elige «Instalar aplicación».");
      return;
    }
    await evento.prompt();
    const eleccion = await evento.userChoice;
    if (eleccion.outcome === "accepted") {
      setInstalada(true);
      setEvento(null);
    }
  };

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <Button
        variant="secondary"
        onClick={instalar}
        iconStart={<Icono name="instalar" size={18} />}
      >
        {label}
      </Button>
      {aviso ? (
        <span role="status" className="text-pequeno text-fg-muted">
          {aviso}
        </span>
      ) : null}
    </span>
  );
}

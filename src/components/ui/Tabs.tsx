"use client";

import {
  createContext,
  useContext,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "./types";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Pestañas accesibles: `tablist` / `tab` / `tabpanel`, con navegación por
 * flechas y activación con Enter o Espacio.
 */
export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-1 border-b border-border"
    >
      {children}
    </div>
  );
}

export function Tab({
  value,
  children,
  disabled = false,
}: {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const contexto = useContext(TabsContext);
  if (!contexto) throw new Error("Tab debe usarse dentro de <Tabs>");
  const seleccionado = contexto.value === value;

  const onKeyDown = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
    const hermanos = Array.from(
      evento.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      ) ?? [],
    );
    if (hermanos.length === 0) return;
    const indice = hermanos.indexOf(evento.currentTarget);
    if (indice === -1) return;
    const siguiente =
      evento.key === "ArrowRight"
        ? (indice + 1) % hermanos.length
        : (indice - 1 + hermanos.length) % hermanos.length;
    const destino = hermanos[siguiente];
    if (!destino) return;
    evento.preventDefault();
    destino.focus();
    destino.click();
  };

  return (
    <button
      type="button"
      role="tab"
      id={`${contexto.baseId}-tab-${value}`}
      aria-selected={seleccionado}
      aria-controls={`${contexto.baseId}-panel-${value}`}
      tabIndex={seleccionado ? 0 : -1}
      disabled={disabled}
      onClick={() => contexto.setValue(value)}
      onKeyDown={onKeyDown}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-pequeno font-medium transition-colors",
        seleccionado
          ? "border-primary text-fg"
          : "border-transparent text-fg-muted hover:text-fg",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const contexto = useContext(TabsContext);
  if (!contexto) throw new Error("TabPanel debe usarse dentro de <Tabs>");
  if (contexto.value !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${contexto.baseId}-panel-${value}`}
      aria-labelledby={`${contexto.baseId}-tab-${value}`}
      tabIndex={0}
      className="pt-4"
    >
      {children}
    </div>
  );
}

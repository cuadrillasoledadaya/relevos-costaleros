"use client";

import type { ReactNode } from "react";

import { Icono } from "../ui/Icono";
import { ToastProvider } from "../ui/Toast";
import { cn } from "../ui/types";

import { Navegacion, type NavItem } from "./Navegacion";

export type AppShellProps = {
  children: ReactNode;
  /**
   * `root`_envuelve sólo el contenido (lo usa el layout raíz, para que el
   * grupo autenticado monte su propio shell sin anidar dos `<main>`).
   * `app` monta cabecera, navegación y zona de contenido.
   */
  variant?: "root" | "app";
  /** Título de la aplicación o de la sección. */
  title?: string;
  /** Destinos de la navegación principal. */
  nav?: NavItem[];
  /** Contenido de la cabecera a la derecha (acciones, avatar, etc.). */
  headerActions?: ReactNode;
  className?: string;
};

/**
 * Shell de la aplicación: cabecera, navegación y zona de contenido.
 * La navegación es lateral en escritorio y una barra inferior en móvil.
 */
export function AppShell({
  children,
  variant = "app",
  title = "Relevos de costaleros",
  nav = [],
  headerActions,
  className,
}: AppShellProps) {
  return (
    <ToastProvider>
      <div className={cn("min-h-dvh bg-bg text-fg", className)}>
        {variant === "root" ? (
          children
        ) : (
          <>
            <a
              href="#contenido"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-header focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg"
            >
              Saltar al contenido
            </a>

            <header className="sticky top-0 z-header border-b border-border bg-surface">
              <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Icono
                    name="paso"
                    size={24}
                    className="shrink-0 text-primary"
                  />
                  <span className="truncate text-cabecera font-semibold">
                    {title}
                  </span>
                </div>
                {headerActions ? (
                  <div className="flex items-center gap-2">{headerActions}</div>
                ) : null}
              </div>
            </header>

            <div className="mx-auto flex w-full max-w-5xl gap-6 px-4">
              {nav.length > 0 ? (
                <aside className="hidden w-56 shrink-0 py-6 md:block">
                  <Navegacion items={nav} variant="sidebar" />
                </aside>
              ) : null}

              <main
                id="contenido"
                className="min-w-0 flex-1 py-4 pb-24 md:pb-8"
              >
                {children}
              </main>
            </div>

            {nav.length > 0 ? (
              <Navegacion items={nav} variant="bottom" />
            ) : null}
          </>
        )}
      </div>
    </ToastProvider>
  );
}

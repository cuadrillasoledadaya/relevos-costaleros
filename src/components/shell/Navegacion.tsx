"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icono } from "../ui/Icono";
import { cn } from "../ui/types";
import type { IconName } from "../ui/types";

export type NavItem = {
  /** Identificador estable del destino. */
  key: string;
  /** Etiqueta visible. */
  label: string;
  /** Ruta de la pantalla. */
  href: string;
  /** Icono del catálogo del design system. */
  icon?: IconName;
  /** Marca activo sólo si la ruta coincide exactamente. */
  exact?: boolean;
};

export type NavegacionProps = {
  items: NavItem[];
  /** Variante visual: lateral en escritorio, barra inferior en móvil. */
  variant: "sidebar" | "bottom";
  className?: string;
};

function estaActivo(rutaActual: string, item: NavItem): boolean {
  if (item.exact) return rutaActual === item.href;
  return rutaActual === item.href || rutaActual.startsWith(`${item.href}/`);
}

/** Navegación principal: lateral en escritorio, barra inferior en móvil. */
export function Navegacion({ items, variant, className }: NavegacionProps) {
  const rutaActual = usePathname();

  if (variant === "bottom") {
    return (
      <nav
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface",
          "pb-[env(safe-area-inset-bottom)] md:hidden",
          className,
        )}
      >
        <ul className="flex items-stretch justify-around">
          {items.map((item) => {
            const activo = estaActivo(rutaActual, item);
            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2 text-pequeno",
                    activo ? "font-semibold text-primary" : "text-fg-muted",
                  )}
                >
                  {item.icon ? <Icono name={item.icon} size={22} /> : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegación principal"
      className={cn("flex flex-col gap-1", className)}
    >
      {items.map((item) => {
        const activo = estaActivo(rutaActual, item);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-cuerpo",
              activo
                ? "bg-primary-soft font-semibold text-primary-fg-soft"
                : "text-fg hover:bg-surface-sunken",
            )}
          >
            {item.icon ? <Icono name={item.icon} size={20} /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

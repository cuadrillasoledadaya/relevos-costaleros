import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icono } from "./Icono";
import { cn } from "./types";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra el estado de carga: deshabilita el botón y lo anuncia. */
  loading?: boolean;
  /** Texto que se anuncia a lectores de pantalla mientras carga. */
  loadingText?: string;
  fullWidth?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
};

const VARIANTES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active shadow-xs",
  secondary:
    "bg-surface text-fg border border-border-strong hover:bg-surface-sunken active:bg-surface-sunken",
  ghost:
    "bg-transparent text-fg hover:bg-surface-sunken active:bg-surface-sunken",
  danger:
    "bg-danger text-danger-fg hover:bg-danger-hover active:bg-danger-active shadow-xs",
};

const TAMANOS: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-pequeno gap-1.5",
  md: "min-h-11 px-4 text-cuerpo gap-2",
  lg: "min-h-12 px-5 text-cabecera gap-2",
};

/** Botón del design system. Estados: default, hover, focus, disabled y loading. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText = "Cargando…",
  fullWidth = false,
  iconStart,
  iconEnd,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading ? "true" : undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        VARIANTES[variant],
        TAMANOS[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {loading ? <span className="sr-only">{loadingText}</span> : null}
      {iconStart}
      {children}
      {iconEnd}
    </button>
  );
}

export type IconButtonProps = Omit<
  ButtonProps,
  "children" | "iconStart" | "iconEnd"
> & {
  /** Nombre accesible obligatorio: el botón no tiene texto visible. */
  label: string;
  icon: ReactNode;
};

/** Botón sólo con icono. Requiere `label` para ser accesible. */
export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const dimensiones =
    size === "sm" ? "size-9" : size === "lg" ? "size-12" : "size-11";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTES[variant],
        dimensiones,
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}

/** Icono de acción rápida dentro de un `Button` secundario. */
export function BotonConIcono({
  label,
  icon,
  ...rest
}: Omit<IconButtonProps, "icon"> & { icon?: ReactNode }) {
  return (
    <IconButton
      label={label}
      icon={icon ?? <Icono name="mas" size={18} />}
      {...rest}
    />
  );
}

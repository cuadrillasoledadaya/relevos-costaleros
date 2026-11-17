import type { ReactNode } from "react";

import { cn } from "./types";
import type { Tone } from "./types";

export type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const TONOS: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-fg-muted border-border",
  primary: "bg-primary-soft text-primary-fg-soft border-primary-soft",
  success: "bg-success-soft text-success-fg-soft border-success-soft",
  warning: "bg-warning-soft text-warning-fg-soft border-warning-soft",
  danger: "bg-danger-soft text-danger-fg-soft border-danger-soft",
  info: "bg-info-soft text-info-fg-soft border-info-soft",
};

/** Etiqueta breve de estado (no interactiva). */
export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-pequeno font-medium",
        TONOS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type TagProps = {
  children: ReactNode;
  /** Si se indica, la etiqueta muestra un botón para quitarla. */
  onRemove?: () => void;
  /** Nombre accesible del botón de quitar. */
  removeLabel?: string;
  className?: string;
};

/** Etiqueta removable (chip). */
export function Tag({
  children,
  onRemove,
  removeLabel = "Quitar",
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-surface-sunken px-2 py-1 text-pequeno text-fg",
        className,
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="rounded-sm text-fg-muted hover:text-fg"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

import type { ReactNode } from "react";

import { Icono } from "./Icono";
import { cn } from "./types";
import type { Tone } from "./types";

export type AlertProps = {
  /** Tono del aviso. `danger` y `warning` se anuncian con `role="alert"`. */
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  /** Si se indica, muestra un botón para cerrar el aviso. */
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
};

const TONOS: Record<Tone, string> = {
  neutral: "border-border bg-surface-sunken text-fg",
  primary: "border-primary-soft bg-primary-soft text-primary-fg-soft",
  success: "border-success-soft bg-success-soft text-success-fg-soft",
  warning: "border-warning-soft bg-warning-soft text-warning-fg-soft",
  danger: "border-danger-soft bg-danger-soft text-danger-fg-soft",
  info: "border-info-soft bg-info-soft text-info-fg-soft",
};

const ICONOS: Record<Tone, "aviso" | "error" | "info" | "check"> = {
  neutral: "info",
  primary: "info",
  success: "check",
  warning: "aviso",
  danger: "error",
  info: "info",
};

/** Aviso destacado dentro de una pantalla. */
export function Alert({
  tone = "info",
  title,
  children,
  onClose,
  closeLabel = "Cerrar aviso",
  className,
}: AlertProps) {
  const role = tone === "danger" || tone === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-md border p-3",
        TONOS[tone],
        className,
      )}
    >
      <Icono name={ICONOS[tone]} size={20} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-pequeno">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="[&_p]:m-0">{children}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="rounded-sm hover:opacity-70"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

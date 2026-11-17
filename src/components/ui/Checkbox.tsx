import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "./types";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Texto visible de la casilla. */
  label: ReactNode;
  /** Texto adicional bajo la etiqueta. */
  description?: ReactNode;
  invalid?: boolean;
};

/** Casilla de verificación nativa, con etiqueta y descripción asociadas. */
export function Checkbox({
  label,
  description,
  invalid,
  className,
  id,
  disabled,
  ...rest
}: CheckboxProps) {
  const inputId = id ?? rest.name ?? undefined;
  const descriptionId =
    description && inputId ? `${inputId}-description` : undefined;

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <input
        type="checkbox"
        id={inputId}
        disabled={disabled}
        aria-invalid={invalid ? true : rest["aria-invalid"]}
        aria-describedby={rest["aria-describedby"] ?? descriptionId}
        className={cn(
          "mt-0.5 size-5 shrink-0 rounded-sm border-border-strong accent-primary",
          "disabled:cursor-not-allowed disabled:opacity-60",
          invalid && "border-danger",
        )}
        {...rest}
      />
      <div className="flex flex-col">
        <label htmlFor={inputId} className="text-cuerpo text-fg">
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="text-pequeno text-fg-muted">
            {description}
          </span>
        ) : null}
      </div>
    </div>
  );
}

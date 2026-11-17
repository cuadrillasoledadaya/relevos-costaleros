import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "./types";

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
  /** Sólo afecta al aspecto: el estado inválido se anuncia en el `FormField`. */
  invalid?: boolean;
};

/** Opción de radio nativa, con etiqueta y descripción asociadas. */
export function Radio({
  label,
  description,
  invalid,
  className,
  id,
  disabled,
  ...rest
}: RadioProps) {
  const inputId = id ?? rest.name ?? undefined;
  const descriptionId =
    description && inputId ? `${inputId}-description` : undefined;

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <input
        type="radio"
        id={inputId}
        disabled={disabled}
        aria-describedby={rest["aria-describedby"] ?? descriptionId}
        className={cn(
          "mt-0.5 size-5 shrink-0 rounded-full border-border-strong accent-primary",
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

export type RadioGroupProps = {
  /** Nombre del grupo: agrupa las opciones y permite elegir una sola. */
  name: string;
  /** Etiqueta del grupo. */
  label?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Grupo de opciones excluyentes. */
export function RadioGroup({
  name,
  label,
  children,
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <legend className="text-pequeno font-medium text-fg">{label}</legend>
      ) : null}
      {children}
      <input type="hidden" name={name} value="" readOnly hidden />
    </fieldset>
  );
}

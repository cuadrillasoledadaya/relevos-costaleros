import { cloneElement, isValidElement, type ReactNode } from "react";

import { cn } from "./types";

export type FormFieldProps = {
  /** Identificador del control: enlaza la etiqueta y el mensaje de error. */
  id: string;
  label: ReactNode;
  /** Texto de ayuda bajo el control. */
  helper?: ReactNode;
  /** Mensaje de error. Su presencia marca el control como inválido. */
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Envoltorio de campo: etiqueta, control, ayuda y error.
 *
 * Conecta automáticamente el control con la etiqueta (`htmlFor`), con la ayuda
 * (`aria-describedby`) y marca el error (`aria-invalid` + `role="alert"`).
 */
export function FormField({
  id,
  label,
  helper,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [helperId, errorId]
      .filter((valor): valor is string => typeof valor === "string")
      .join(" ") || undefined;

  let control = children;
  if (isValidElement<ControlProps>(children)) {
    const props = children.props;
    control = cloneElement(children, {
      id: props.id ?? id,
      "aria-describedby": props["aria-describedby"] ?? describedBy,
      "aria-invalid": error ? true : props["aria-invalid"],
    });
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-pequeno font-medium text-fg">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden="true">
            {" *"}
          </span>
        ) : null}
        {required ? <span className="sr-only">(obligatorio)</span> : null}
      </label>
      {control}
      {helper ? (
        <p id={helperId} className="text-pequeno text-fg-muted">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-pequeno font-medium text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

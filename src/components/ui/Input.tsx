import type { InputHTMLAttributes } from "react";

import { cn } from "./types";
import type { ControlSize } from "./types";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  /** Tamaño del control. */
  controlSize?: ControlSize;
  /** Marca el campo como inválido (además de `aria-invalid`). */
  invalid?: boolean;
};

const TAMANOS: Record<ControlSize, string> = {
  sm: "min-h-9 px-2.5 text-pequeno",
  md: "min-h-11 px-3 text-cuerpo",
  lg: "min-h-12 px-3.5 text-cuerpo",
};

/** Campo de texto. Estados: default, focus, disabled, invalid y readonly. */
export function Input({
  className,
  controlSize = "md",
  invalid,
  type = "text",
  ...rest
}: InputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid ? true : rest["aria-invalid"]}
      className={cn(
        "w-full rounded-md border bg-surface text-fg placeholder:text-fg-muted",
        "transition-colors disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted",
        "read-only:bg-surface-sunken",
        invalid ? "border-danger" : "border-border-strong",
        TAMANOS[controlSize],
        className,
      )}
      {...rest}
    />
  );
}

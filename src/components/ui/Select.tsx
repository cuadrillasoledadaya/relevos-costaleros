import type { SelectHTMLAttributes } from "react";

import { Icono } from "./Icono";
import { cn } from "./types";
import type { ControlSize } from "./types";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  controlSize?: ControlSize;
  invalid?: boolean;
};

const TAMANOS: Record<ControlSize, string> = {
  sm: "min-h-9 pl-2.5 pr-8 text-pequeno",
  md: "min-h-11 pl-3 pr-9 text-cuerpo",
  lg: "min-h-12 pl-3.5 pr-9 text-cuerpo",
};

/** Lista desplegable nativa (accesible por teclado y con lector de pantalla). */
export function Select({
  className,
  controlSize = "md",
  invalid,
  children,
  ...rest
}: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid ? true : rest["aria-invalid"]}
        className={cn(
          "w-full appearance-none rounded-md border bg-surface text-fg",
          "transition-colors disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted",
          invalid ? "border-danger" : "border-border-strong",
          TAMANOS[controlSize],
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <Icono
        name="abajo"
        size={18}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-fg-muted"
      />
    </div>
  );
}

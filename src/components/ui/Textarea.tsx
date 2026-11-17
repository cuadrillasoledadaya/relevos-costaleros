import type { TextareaHTMLAttributes } from "react";

import { cn } from "./types";
import type { ControlSize } from "./types";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  controlSize?: ControlSize;
  invalid?: boolean;
};

const TAMANOS: Record<ControlSize, string> = {
  sm: "min-h-20 px-2.5 py-1.5 text-pequeno",
  md: "min-h-24 px-3 py-2 text-cuerpo",
  lg: "min-h-32 px-3.5 py-2.5 text-cuerpo",
};

/** Área de texto multilínea. Estados: default, focus, disabled e invalid. */
export function Textarea({
  className,
  controlSize = "md",
  invalid,
  rows = 3,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid ? true : rest["aria-invalid"]}
      className={cn(
        "w-full resize-y rounded-md border bg-surface text-fg placeholder:text-fg-muted",
        "transition-colors disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted",
        invalid ? "border-danger" : "border-border-strong",
        TAMANOS[controlSize],
        className,
      )}
      {...rest}
    />
  );
}

import { cn } from "./types";

export type SpinnerSize = "sm" | "md" | "lg";

export type SpinnerProps = {
  size?: SpinnerSize;
  /** Texto que se anuncia a lectores de pantalla. */
  label?: string;
  className?: string;
};

const TAMANOS: Record<SpinnerSize, string> = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-9 border-[3px]",
};

/** Indicador de carga con texto accesible. */
export function Spinner({
  size = "md",
  label = "Cargando",
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block animate-spin rounded-full border-current border-t-transparent",
          TAMANOS[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

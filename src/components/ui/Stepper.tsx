import { cn } from "./types";

export type StepperStep = {
  /** Identificador del paso. */
  key: string;
  /** Etiqueta visible. */
  label: string;
  /** Texto opcional de apoyo. */
  description?: string;
};

export type StepperProps = {
  steps: StepperStep[];
  /** Índice (0-based) del paso actual. */
  current: number;
  /** Nombre accesible del indicador. */
  label?: string;
  className?: string;
};

/**
 * Barra de progreso del wizard: muestra los pasos y cuál es el actual.
 * El paso actual se marca con `aria-current="step"`.
 */
export function Stepper({
  steps,
  current,
  label = "Progreso",
  className,
}: StepperProps) {
  const total = steps.length;
  const indice = Math.min(Math.max(current, 0), Math.max(total - 1, 0));
  const pasoActual = steps[indice];

  return (
    <nav aria-label={label} className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={indice + 1}
        aria-valuetext={
          pasoActual
            ? `Paso ${indice + 1} de ${total}: ${pasoActual.label}`
            : undefined
        }
        className="flex w-full gap-1"
      >
        {steps.map((paso, posicion) => (
          <span
            key={paso.key}
            aria-hidden="true"
            className={cn(
              "h-1 flex-1 rounded-full",
              posicion <= indice ? "bg-primary" : "bg-surface-sunken",
            )}
          />
        ))}
      </div>
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {steps.map((paso, posicion) => {
          const estado =
            posicion < indice
              ? "completado"
              : posicion === indice
                ? "actual"
                : "pendiente";
          return (
            <li key={paso.key} className="flex min-w-0 flex-col">
              <span
                aria-current={estado === "actual" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-pequeno",
                  estado === "actual" && "font-semibold text-fg",
                  estado === "completado" && "text-fg-muted",
                  estado === "pendiente" && "text-fg-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-pequeno",
                    estado === "completado" &&
                      "border-primary bg-primary text-primary-fg",
                    estado === "actual" &&
                      "border-primary bg-primary-soft text-primary-fg-soft",
                    estado === "pendiente" &&
                      "border-border-strong text-fg-muted",
                  )}
                >
                  {estado === "completado" ? "✓" : posicion + 1}
                </span>
                <span className="truncate">{paso.label}</span>
              </span>
              {paso.description ? (
                <span className="pl-8 text-pequeno text-fg-muted">
                  {paso.description}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./types";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Tarjeta: superficie con borde y sombra suave. */
export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface shadow-xs",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type CardSectionProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Cabecera de la tarjeta. */
export function CardHeader({ children, className, ...rest }: CardSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-border p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Título de la tarjeta. */
export function CardTitle({ children, className, ...rest }: CardSectionProps) {
  return (
    <h2
      className={cn("text-cabecera font-semibold text-fg", className)}
      {...rest}
    >
      {children}
    </h2>
  );
}

/** Cuerpo de la tarjeta. */
export function CardBody({ children, className, ...rest }: CardSectionProps) {
  return (
    <div className={cn("flex flex-col gap-3 p-4", className)} {...rest}>
      {children}
    </div>
  );
}

/** Pie de la tarjeta. */
export function CardFooter({ children, className, ...rest }: CardSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";

import { cn } from "./types";

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** Acción principal (normalmente un botón). */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

/** Estado vacío: explica qué falta y ofrece la acción para resolverlo. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="text-fg-muted">{icon}</div> : null}
      <h3 className="text-cabecera font-semibold text-fg">{title}</h3>
      {description ? (
        <div className="max-w-prose text-pequeno text-fg-muted">
          {description}
        </div>
      ) : null}
      {action ? (
        <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

"use client";

import { IconButton } from "./Button";
import { cn } from "./types";

export type PaginationProps = {
  /** Página actual (1-based). */
  page: number;
  /** Número total de páginas. */
  totalPages: number;
  /** Se llama con la página solicitada. */
  onPageChange: (page: number) => void;
  /** Nombre accesible del paginador. */
  label?: string;
  className?: string;
};

/** Paginador: sólo con teclado y con nombres accesibles en español. */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  label = "Paginación",
  className,
}: PaginationProps) {
  const total = Math.max(totalPages, 1);
  const actual = Math.min(Math.max(page, 1), total);
  const anterior = actual - 1;
  const siguiente = actual + 1;

  return (
    <nav
      aria-label={label}
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <IconButton
        label="Página anterior"
        icon={<span aria-hidden="true">‹</span>}
        variant="secondary"
        size="sm"
        disabled={actual <= 1}
        onClick={() => onPageChange(anterior)}
      />
      <span aria-live="polite" className="text-pequeno text-fg-muted">
        Página {actual} de {total}
      </span>
      <IconButton
        label="Página siguiente"
        icon={<span aria-hidden="true">›</span>}
        variant="secondary"
        size="sm"
        disabled={actual >= total}
        onClick={() => onPageChange(siguiente)}
      />
    </nav>
  );
}

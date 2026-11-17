"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { IconButton } from "./Button";
import { Icono } from "./Icono";
import { useFocusTrap } from "./useFocusTrap";
import { cn } from "./types";

export type DialogSize = "sm" | "md" | "lg";

export type DialogProps = {
  /** Abre o cierra el diálogo. */
  open: boolean;
  /** Se llama al cerrar (Escape, fondo o botón de cerrar). */
  onClose: () => void;
  /** Título del diálogo: es el nombre accesible de la ventana. */
  title: ReactNode;
  /** Descripción opcional. */
  description?: ReactNode;
  children?: ReactNode;
  /** Acciones del pie del diálogo. */
  footer?: ReactNode;
  size?: DialogSize;
  /** Etiqueta del botón de cerrar. */
  closeLabel?: string;
};

const TAMANOS: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-3xl",
};

/**
 * Diálogo modal: foco atrapado, cierre con Escape y devolución del foco al
 * elemento que lo abrió.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Cerrar",
}: DialogProps) {
  const baseId = useId();
  const titleId = `${baseId}-titulo`;
  const descriptionId = `${baseId}-descripcion`;
  const containerRef = useFocusTrap(open, onClose);

  useEffect(() => {
    if (!open) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-dialog flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        data-testid="dialogo-fondo"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-xl bg-surface shadow-lg",
          "sm:rounded-xl",
          TAMANOS[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <h2 id={titleId} className="text-cabecera font-semibold text-fg">
            {title}
          </h2>
          <IconButton
            label={closeLabel}
            icon={<Icono name="cerrar" size={20} />}
            onClick={onClose}
          />
        </div>
        {description ? (
          <p
            id={descriptionId}
            className="px-4 pt-4 text-pequeno text-fg-muted"
          >
            {description}
          </p>
        ) : null}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

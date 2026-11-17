"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { IconButton } from "./Button";
import { Icono } from "./Icono";
import { useFocusTrap } from "./useFocusTrap";
import { cn } from "./types";

export type SheetProps = {
  /** Abre o cierra el panel inferior. */
  open: boolean;
  /** Se llama al cerrar (Escape, fondo o botón de cerrar). */
  onClose: () => void;
  /** Título del panel. */
  title: ReactNode;
  children?: ReactNode;
  /** Acciones fijadas al pie del panel. */
  footer?: ReactNode;
  /** Etiqueta del botón de cerrar. */
  closeLabel?: string;
  /** Altura máxima del panel. */
  maxHeight?: "60dvh" | "80dvh" | "90dvh";
};

/**
 * Panel inferior (patrón de móvil): hoja que sube desde el borde inferior,
 * con foco atrapado y cierre con Escape.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  closeLabel = "Cerrar",
  maxHeight = "80dvh",
}: SheetProps) {
  const baseId = useId();
  const titleId = `${baseId}-titulo`;
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
    <div className="fixed inset-0 z-sheet flex items-end justify-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        data-testid="sheet-fondo"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-surface shadow-xl",
          "pb-[env(safe-area-inset-bottom)]",
          maxHeight,
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

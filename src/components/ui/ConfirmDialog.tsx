"use client";

import type { ReactNode } from "react";

import { Button } from "./Button";
import { Dialog } from "./Dialog";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Acción principal. */
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tono del botón principal. `danger` para acciones destructivas. */
  tone?: "primary" | "danger";
  /** Texto del botón mientras se ejecuta la confirmación. */
  confirmLoadingText?: string;
  loading?: boolean;
};

/** Diálogo de confirmación reutilizable (borrar, publicar, descartar…). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  confirmLoadingText = "Confirmando…",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            loadingText={confirmLoadingText}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

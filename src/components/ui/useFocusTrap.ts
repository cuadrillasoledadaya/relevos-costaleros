"use client";

import { useEffect, useRef } from "react";

const SELECTORES_FOCO =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trampa de foco para diálogos modales.
 *
 * - al activar, mueve el foco dentro del contenedor;
 * - con `Tab`/`Shift+Tab` el foco no sale del contenedor;
 * - con `Escape` llama a `onEscape`;
 * - al desactivar, devuelve el foco al elemento que lo abrió.
 */
export function useFocusTrap(active: boolean, onEscape?: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const escapeRef = useRef<(() => void) | undefined>(onEscape);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;

    previousFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const getFocusables = (): HTMLElement[] => {
      const node = containerRef.current;
      if (!node) return [];
      return Array.from(
        node.querySelectorAll<HTMLElement>(SELECTORES_FOCO),
      ).filter(
        (elemento) =>
          !elemento.hasAttribute("hidden") &&
          elemento.getAttribute("aria-hidden") !== "true",
      );
    };

    const primero = getFocusables()[0] ?? containerRef.current;
    primero?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = getFocusables();
      if (focusables.length === 0) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (!primero || !ultimo) return;

      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const anterior = previousFocusRef.current;
      if (anterior && typeof anterior.focus === "function") anterior.focus();
    };
  }, [active]);

  return containerRef;
}

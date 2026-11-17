"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Icono } from "./Icono";
import { cn } from "./types";

export type ToastTone = "info" | "success" | "warning" | "danger";

export type ToastOptions = {
  tone?: ToastTone;
  description?: ReactNode;
  /** Milisegundos que se mantiene visible. 0 para que no se cierre solo. */
  duration?: number;
};

export type ToastItem = ToastOptions & {
  id: string;
  message: ReactNode;
};

type ToastContextValue = {
  /** Muestra un aviso y devuelve su identificador. */
  show: (message: ReactNode, options?: ToastOptions) => string;
  /** Cierra un aviso concreto. */
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Acceso al sistema de avisos. Debe usarse dentro de `ToastProvider`. */
export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return contexto;
}

const DURACION_POR_DEFECTO = 5000;

const TONOS: Record<ToastTone, string> = {
  info: "border-info-soft bg-info-soft text-info-fg-soft",
  success: "border-success-soft bg-success-soft text-success-fg-soft",
  warning: "border-warning-soft bg-warning-soft text-warning-fg-soft",
  danger: "border-danger-soft bg-danger-soft text-danger-fg-soft",
};

const ICONOS: Record<ToastTone, "info" | "check" | "aviso" | "error"> = {
  info: "info",
  success: "check",
  warning: "aviso",
  danger: "error",
};

export type ToastProps = {
  item: ToastItem;
  onDismiss: (id: string) => void;
};

/** Aviso individual. */
export function Toast({ item, onDismiss }: ToastProps) {
  const tone = item.tone ?? "info";
  const role = tone === "danger" || tone === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg",
        TONOS[tone],
      )}
    >
      <Icono name={ICONOS[tone]} size={20} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-pequeno">
        <p className="font-medium">{item.message}</p>
        {item.description ? <p className="mt-1">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Cerrar aviso"
        className="rounded-sm hover:opacity-70"
      >
        ×
      </button>
    </div>
  );
}

export type ToastProviderProps = {
  children: ReactNode;
  /** Duración por defecto de los avisos, en milisegundos. */
  duration?: number;
};

/**
 * Proveedor de avisos (toasts). Renderiza una región `aria-live` fija en la
 * parte inferior, sobre el contenido.
 */
export function ToastProvider({
  children,
  duration = DURACION_POR_DEFECTO,
}: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const contadorRef = useRef(0);
  const temporizadoresRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: string) => {
    setItems((actuales) => actuales.filter((item) => item.id !== id));
    const temporizador = temporizadoresRef.current.get(id);
    if (temporizador) {
      clearTimeout(temporizador);
      temporizadoresRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: ReactNode, options?: ToastOptions) => {
      contadorRef.current += 1;
      const id = `aviso-${contadorRef.current}`;
      const item: ToastItem = { id, message, ...options };
      setItems((actuales) => [...actuales, item]);

      const milisegundos = options?.duration ?? duration;
      if (milisegundos > 0) {
        const temporizador = setTimeout(() => dismiss(id), milisegundos);
        temporizadoresRef.current.set(id, temporizador);
      }
      return id;
    },
    [dismiss, duration],
  );

  const valor = useMemo<ToastContextValue>(
    () => ({ show, dismiss }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        role="region"
        aria-label="Avisos"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-end"
      >
        {items.map((item) => (
          <Toast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

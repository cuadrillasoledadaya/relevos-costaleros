/**
 * Design system de "Relevos de costaleros".
 *
 * Tokens semánticos: los componentes NUNCA usan colores literales, sólo utilidades
 * Tailwind derivadas de estas variables (ver `src/app/globals.css`).
 */

/** Tamaños de control (botones, campos, etc.). */
export type ControlSize = "sm" | "md" | "lg";

/** Tonos semánticos de estado. */
export type Tone =
  "neutral" | "primary" | "success" | "warning" | "danger" | "info";

/** Union de clases, ignorando valores vacíos. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts
    .filter((parte) => typeof parte === "string" && parte.length > 0)
    .join(" ");
}

/** Propiedades comunes de los iconos del design system. */
export type IconProps = {
  /** Nombre del icono del catálogo. */
  name: IconName;
  /** Lado del cuadrado del icono, en píxeles. */
  size?: number;
  className?: string;
  /** Texto alternativo. Sin él, el icono se marca como decorativo. */
  title?: string;
};

/** Nombres disponibles en el catálogo de iconos. */
export type IconName =
  | "cuadrilla"
  | "paso"
  | "tramo"
  | "plan"
  | "hoja"
  | "costalero"
  | "instalar"
  | "menu"
  | "cerrar"
  | "mas"
  | "menos"
  | "arriba"
  | "abajo"
  | "izquierda"
  | "derecha"
  | "check"
  | "aviso"
  | "error"
  | "info"
  | "buscar"
  | "imprimir"
  | "descargar"
  | "reloj";

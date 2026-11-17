import type { IconName, IconProps } from "./types";

/**
 * Catálogo de iconos propio del proyecto (sin librerías de terceros).
 * Trazo de 24×24, sin relleno, para que hereden el color del texto.
 */
const TRAZOS: Record<IconName, string> = {
  cuadrilla:
    "M6 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4M12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4M3 17a3 3 0 0 1 6 0M9 17a3 3 0 0 1 6 0M15 17a3 3 0 0 1 6 0",
  paso: "M3 8h18M6 8v3M12 8v3M18 8v3M6 11v7M12 11v7M18 11v7",
  tramo: "M4 19h16M6 19V10M12 19V6M18 19v-6",
  plan: "M7 4h7l4 4v12H7zM14 4v4h4M10 13h6M10 17h6",
  hoja: "M4 5h16v14H4zM4 10h16M9 10v9M15 10v9",
  costalero: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  instalar: "M12 3v11M8 10l4 4 4-4M5 19h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  cerrar: "M6 6l12 12M18 6L6 18",
  mas: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  arriba: "M12 19V5M5 12l7-7 7 7",
  abajo: "M12 5v14M19 12l-7 7-7-7",
  izquierda: "M15 5l-7 7 7 7",
  derecha: "M9 5l7 7-7 7",
  check: "M5 13l4 4L19 7",
  aviso: "M12 4l9 16H3l9-16zM12 10v4M12 17h.01",
  error: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
  buscar: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.5-4.5",
  imprimir: "M7 9V4h10v5M7 18H5v-6h14v6h-2M7 14h10v6H7z",
  descargar: "M12 4v10M8 11l4 4 4-4M5 19h14",
  reloj: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
};

/** Icono del catálogo. Sin `title` es decorativo (`aria-hidden`). */
export function Icono({ name, size = 24, className, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={TRAZOS[name]} />
    </svg>
  );
}

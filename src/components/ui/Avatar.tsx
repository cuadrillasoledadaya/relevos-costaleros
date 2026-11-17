import { cn } from "./types";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = {
  /** Nombre completo de la persona: de ahí salen las iniciales. */
  name: string;
  /** Imagen opcional. Si falla o no existe, se muestran las iniciales. */
  src?: string;
  size?: AvatarSize;
  className?: string;
};

const TAMANOS: Record<AvatarSize, string> = {
  sm: "size-8 text-pequeno",
  md: "size-10 text-cuerpo",
  lg: "size-14 text-titulo",
};

/** Devuelve las iniciales de un nombre (máximo dos letras). */
export function iniciales(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0);
  const primera = palabras[0]?.charAt(0) ?? "";
  const segunda =
    palabras.length > 1 ? (palabras[palabras.length - 1]?.charAt(0) ?? "") : "";
  return `${primera}${segunda}`.toUpperCase();
}

/** Avatar con iniciales. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const texto = iniciales(name);

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary-fg-soft",
        TAMANOS[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- el avatar es decorativo y pequeño
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        texto
      )}
    </span>
  );
}

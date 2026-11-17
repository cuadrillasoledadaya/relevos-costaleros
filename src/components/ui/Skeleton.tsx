import { cn } from "./types";

export type SkeletonProps = {
  className?: string;
};

/** Marcador de carga (skeleton). Es decorativo: se oculta a lectores de pantalla. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-sunken", className)}
    />
  );
}

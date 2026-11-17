import { Skeleton } from "@/components/ui";

export type CargandoContenidoProps = {
  etiqueta: string;
  filas?: number;
};

/** Estado de carga anunciado para las pantallas de cuadrillas y mi relevo. */
export function CargandoContenido({
  etiqueta,
  filas = 3,
}: CargandoContenidoProps) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3">
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: filas }, (_, indice) => (
        <Skeleton key={indice} className="h-24 w-full" />
      ))}
    </div>
  );
}

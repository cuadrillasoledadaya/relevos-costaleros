import { Skeleton } from "@/components/ui/Skeleton";

/** Estado de carga de la configuración del paso (§9). */
export default function LoadingConfiguracion() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-12 w-40" />
    </div>
  );
}

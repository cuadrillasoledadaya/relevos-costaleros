import { Skeleton } from "@/components/ui";

/** Estado de carga del apartado de tramos (§9). */
export default function LoadingTramos() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-12 w-40" />
    </div>
  );
}

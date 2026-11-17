"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { cn } from "@/components/ui/types";

/** Datos del selector de pasos. */
export type CabeceraPasoProps = {
  /** Nombre del paso actual. */
  nombre: string;
  /** Pasos de la cuadrilla, para poder cambiar de uno a otro (P-2). */
  pasos: Array<{ id: string; name: string }>;
  /** Id del paso actual. */
  pasoId: string;
  /** Id de la cuadrilla. */
  cuadrillaId: string;
};

/**
 * Cabecera del paso: nombre, selector de paso y enlaces a las secciones
 * (Configuración, Tramos, Plan y Hoja). La comparten el wizard (W5), el
 * apartado de tramos (W6), el plan (W7) y la hoja (W8).
 */
export function CabeceraPaso({
  nombre,
  pasos,
  pasoId,
  cuadrillaId,
}: CabeceraPasoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const base = `/cuadrillas/${cuadrillaId}/paso/${pasoId}`;
  const secciones = [
    { href: `${base}/configuracion`, label: "Configuración" },
    { href: `${base}/tramos`, label: "Tramos" },
    { href: `${base}/plan`, label: "Plan" },
    { href: `${base}/hoja`, label: "Hoja" },
  ];

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-pequeno text-fg-muted">Paso</p>
          <h1 className="truncate text-cabecera font-semibold text-fg">
            {nombre}
          </h1>
        </div>
        <FormField
          id="selector-paso"
          label="Cambiar de paso"
          className="min-w-56"
        >
          <Select
            id="selector-paso"
            value={pasoId}
            onChange={(event) =>
              router.push(
                `/cuadrillas/${cuadrillaId}/paso/${event.target.value}/configuracion`,
              )
            }
          >
            {pasos.length === 0 ? (
              <option value={pasoId}>Sin pasos</option>
            ) : null}
            {pasos.map((paso) => (
              <option key={paso.id} value={paso.id}>
                {paso.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <nav aria-label="Secciones del paso">
        <ul className="flex flex-wrap gap-2">
          {secciones.map((seccion) => {
            const activo = pathname === seccion.href;
            return (
              <li key={seccion.href}>
                <Link
                  href={seccion.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-md border border-border px-3 text-pequeno font-medium",
                    activo
                      ? "bg-primary text-primary-fg"
                      : "bg-surface text-fg hover:bg-surface-sunken",
                  )}
                >
                  {seccion.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

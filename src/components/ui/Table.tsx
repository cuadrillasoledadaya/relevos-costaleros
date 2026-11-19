import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { Icono } from "./Icono";
import { cn } from "./types";

export type TableSort = {
  key: string;
  direction: "asc" | "desc";
};

export type TableColumn = {
  /** Clave de la columna: se usa para ordenar. */
  key: string;
  /** Texto de la cabecera. */
  header: ReactNode;
  /** Permite ordenar por esta columna. */
  sortable?: boolean;
  /** Texto plano para el nombre accesible del botón de ordenación. */
  sortLabel?: string;
  align?: "left" | "center" | "right";
  className?: string;
};

export type TableProps = {
  columns: TableColumn[];
  /** Orden actual (controlado). */
  sort?: TableSort;
  /** Se llama con el nuevo orden cuando el usuario pulsa una cabecera ordenable. */
  onSortChange?: (sort: TableSort) => void;
  /** Filas: cada una es un `TableRow`. */
  children: ReactNode;
  caption?: ReactNode;
  className?: string;
};

const ALINEACIONES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * Tabla con ordenación por cabecera y contenedor con scroll horizontal
 * (obligatorio en móvil, donde la hoja de relevos no cabe en pantalla).
 */
export function Table({
  columns,
  sort,
  onSortChange,
  children,
  caption,
  className,
}: TableProps) {
  return (
    // El contenedor con scroll horizontal tiene que poder recibir el foco:
    // si no, quien navega con teclado no puede desplazar la tabla (regla
    // «scrollable-region-focusable» de axe-core, hallada en W9).
    <div className={cn("w-full overflow-x-auto", className)} tabIndex={0}>
      <table className="w-full border-collapse text-cuerpo">
        {caption ? (
          <caption className="p-2 text-left text-pequeno text-fg-muted">
            {caption}
          </caption>
        ) : null}
        <thead className="bg-surface-sunken">
          <tr>
            {columns.map((columna) => {
              const activa = sort?.key === columna.key;
              const orden = activa
                ? sort?.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none";
              const siguiente: TableSort = activa
                ? {
                    key: columna.key,
                    direction: sort?.direction === "asc" ? "desc" : "asc",
                  }
                : { key: columna.key, direction: "asc" };
              const etiqueta =
                columna.sortLabel ??
                (typeof columna.header === "string"
                  ? columna.header
                  : columna.key);

              return (
                <th
                  key={columna.key}
                  scope="col"
                  aria-sort={columna.sortable ? orden : undefined}
                  className={cn(
                    "border-b border-border px-3 py-2 text-pequeno font-semibold whitespace-nowrap text-fg",
                    ALINEACIONES[columna.align ?? "left"],
                    columna.className,
                  )}
                >
                  {columna.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange?.(siguiente)}
                      aria-label={`Ordenar por ${etiqueta}`}
                      className="inline-flex items-center gap-1 rounded-sm"
                    >
                      {columna.header}
                      <Icono
                        name={
                          activa && sort?.direction === "desc"
                            ? "abajo"
                            : "arriba"
                        }
                        size={14}
                        className={cn(activa ? "text-fg" : "text-fg-muted")}
                      />
                    </button>
                  ) : (
                    columna.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export type TableRowProps = {
  children: ReactNode;
  /** Estado destacado de la fila (por ejemplo, la que está seleccionada). */
  destacada?: boolean;
  className?: string;
};

/** Fila de la tabla. */
export function TableRow({
  children,
  destacada = false,
  className,
}: TableRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-border last:border-b-0",
        destacada && "bg-primary-soft",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
};

/** Celda de la tabla. */
export function TableCell({ children, className, ...rest }: TableCellProps) {
  return (
    <td className={cn("px-3 py-2 align-middle text-fg", className)} {...rest}>
      {children}
    </td>
  );
}

export type TableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
};

/** Celda de cabecera (para tablas anidadas o pies de tabla). */
export function TableHeaderCell({
  children,
  className,
  ...rest
}: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 text-left text-pequeno font-semibold text-fg",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

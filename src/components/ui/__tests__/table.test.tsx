import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Table, TableCell, TableRow } from "../Table";

const COLUMNAS = [
  { key: "tramo", header: "Tramo" },
  {
    key: "descansan",
    header: "Descansan",
    sortable: true,
    sortLabel: "Descansan",
  },
];

describe("Table", () => {
  it("expone la tabla con su cabecera y sus filas", () => {
    render(
      <Table columns={COLUMNAS} caption="Relevos por tramo">
        <TableRow>
          <TableCell>Salida</TableCell>
          <TableCell>Ana</TableCell>
        </TableRow>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Tramo" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Salida" })).toBeInTheDocument();
  });

  it("permite ordenar por una columna ordenable y avisa del estado", () => {
    const onSortChange = vi.fn();
    render(
      <Table
        columns={COLUMNAS}
        sort={{ key: "descansan", direction: "asc" }}
        onSortChange={onSortChange}
      >
        <TableRow>
          <TableCell>Salida</TableCell>
          <TableCell>Ana</TableCell>
        </TableRow>
      </Table>,
    );
    const cabecera = screen.getByRole("columnheader", { name: /Descansan/ });
    expect(cabecera).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(
      screen.getByRole("button", { name: "Ordenar por Descansan" }),
    );
    expect(onSortChange).toHaveBeenCalledWith({
      key: "descansan",
      direction: "desc",
    });
  });

  it("envuelve la tabla en un contenedor con scroll horizontal para móvil", () => {
    const { container } = render(
      <Table columns={COLUMNAS}>
        <TableRow>
          <TableCell>Salida</TableCell>
          <TableCell>Ana</TableCell>
        </TableRow>
      </Table>,
    );
    const envoltorio = container.querySelector("div");
    expect(envoltorio?.className).toContain("overflow-x-auto");
  });
});

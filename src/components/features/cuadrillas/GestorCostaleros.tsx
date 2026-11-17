"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import type { EstadoAccion } from "@/server/actions/cuadrilla";
import { FormularioCostalero } from "./FormularioCostalero";
import { ListaCostaleros, type CostaleroResumen } from "./ListaCostaleros";

export type GestorCostalerosProps = {
  costaleros: CostaleroResumen[];
  accionCrear: (
    estado: EstadoAccion,
    formData: FormData,
  ) => Promise<EstadoAccion>;
  accionActualizar: (
    estado: EstadoAccion,
    formData: FormData,
  ) => Promise<EstadoAccion>;
  accionEliminar: (costaleroId: string) => Promise<EstadoAccion>;
};

export function GestorCostaleros({
  costaleros,
  accionCrear,
  accionActualizar,
  accionEliminar,
}: GestorCostalerosProps) {
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<CostaleroResumen | null>(null);

  function abrirAlta() {
    setEditando(null);
    setFormularioAbierto(true);
  }

  function abrirEdicion(costalero: CostaleroResumen) {
    setEditando(costalero);
    setFormularioAbierto(true);
  }

  function cerrarFormulario() {
    setEditando(null);
    setFormularioAbierto(false);
  }

  return (
    <section className="grid gap-4" aria-labelledby="costaleros-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="costaleros-titulo" className="text-cabecera font-semibold">
            Costaleros
          </h2>
          <p className="text-pequeno text-fg-muted">
            Gestiona los datos y la cuenta de cada persona.
          </p>
        </div>
        {!formularioAbierto ? (
          <Button type="button" onClick={abrirAlta}>
            Añadir costalero
          </Button>
        ) : null}
      </div>

      {formularioAbierto ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <FormularioCostalero
            key={editando?.id ?? "nuevo"}
            accion={editando ? accionActualizar : accionCrear}
            costalero={editando ?? undefined}
            onCancelar={cerrarFormulario}
          />
        </div>
      ) : null}

      <ListaCostaleros
        costaleros={costaleros}
        onCrear={abrirAlta}
        onEditar={abrirEdicion}
        accionEliminar={accionEliminar}
      />
    </section>
  );
}

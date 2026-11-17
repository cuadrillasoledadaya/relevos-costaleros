"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Stepper, type StepperStep } from "@/components/ui/Stepper";
import { evaluarFactibilidad } from "@/domain/factibilidad";
import {
  fijarBoquillas,
  guardarDatosPaso,
  guardarReparto,
  guardarTramos,
} from "@/server/actions/paso";

import { construirEstado, entradaDeFactibilidad } from "./estado";
import { PasoAsignacion } from "./PasoAsignacion";
import { PasoBoquillas } from "./PasoBoquillas";
import { PasoDatos } from "./PasoDatos";
import { PasoReparto } from "./PasoReparto";
import { PasoResumen } from "./PasoResumen";
import { PasoTramos } from "./PasoTramos";
import type { AccionesWizard, EstadoWizard, PropiedadesWizard } from "./tipos";

/** Los 6 pasos del wizard de creación del paso (P3, §9). */
export const PASOS_WIZARD: StepperStep[] = [
  {
    key: "datos",
    label: "Datos del paso",
    description: "Nombre, año y nº de trabajaderas",
  },
  {
    key: "reparto",
    label: "Costaleros del paso",
    description: "Reparto por trabajadera",
  },
  {
    key: "asignacion",
    label: "Asignación nominal",
    description: "Quién va a cada pool",
  },
  {
    key: "boquillas",
    label: "Boquillas",
    description: "Las 2 boquillas del paso",
  },
  {
    key: "tramos",
    label: "Tramos",
    description: "Cuántos tramos hacen falta",
  },
  {
    key: "resumen",
    label: "Resumen y validación",
    description: "Comprobación F-1 a F-6",
  },
];

/**
 * Wizard de creación del paso (P3).
 *
 * El estado vive en el cliente y se guarda por partes (cada paso tiene su
 * botón). La factibilidad se evalúa en vivo con `evaluarFactibilidad` de W2,
 * de modo que el checklist del paso 6 refleja siempre lo que hay escrito.
 */
export function WizardPaso(props: PropiedadesWizard) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoWizard>(() =>
    construirEstado(props),
  );
  const [version, setVersion] = useState(props.version);
  const [indice, setIndice] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Si los datos del servidor cambian (un guardado, otra pestaña), el wizard
  // se resincroniza con ellos.
  if (version !== props.version) {
    setVersion(props.version);
    setEstado(construirEstado(props));
  }

  const factibilidad = useMemo(
    () =>
      evaluarFactibilidad(
        entradaDeFactibilidad(estado, props.paso.id, props.trabajaderas),
      ),
    [estado, props.paso.id, props.trabajaderas],
  );

  const actualizar = (cambio: Partial<EstadoWizard>) => {
    setEstado((actual) => ({ ...actual, ...cambio }));
    setError(null);
  };

  const guardar = async (
    accion: () => Promise<
      | { ok: true; mensaje: string; datos: unknown }
      | { ok: false; error: string }
    >,
  ) => {
    setCargando(true);
    setAviso(null);
    setError(null);
    try {
      const resultado = await accion();
      if (resultado.ok) {
        setAviso(resultado.mensaje);
        router.refresh();
      } else {
        setError(resultado.error);
      }
    } finally {
      setCargando(false);
    }
  };

  const acciones: AccionesWizard = {
    guardarDatos: () =>
      guardar(() =>
        guardarDatosPaso({
          pasoId: props.paso.id,
          nombre: estado.nombre,
          anio: estado.anio,
          numTrabajaderas: estado.numTrabajaderas,
        }),
      ),
    guardarReparto: () =>
      guardar(() =>
        guardarReparto({
          pasoId: props.paso.id,
          reparto: props.trabajaderas.map((trabajadera) => ({
            trabajaderaId: trabajadera.id,
            costaleros: estado.reparto[trabajadera.id] ?? [],
            carga: estado.cargas[trabajadera.id] ?? trabajadera.carga,
          })),
        }),
      ),
    guardarBoquillas: () =>
      guardar(() =>
        fijarBoquillas({
          pasoId: props.paso.id,
          boquillas: estado.boquillas,
        }),
      ),
    guardarTramos: () =>
      guardar(() =>
        guardarTramos({
          pasoId: props.paso.id,
          nombres: estado.tramos.map((tramo) => tramo.name),
        }),
      ),
    cambiarPaso: (nuevoIndice) =>
      setIndice(Math.min(Math.max(nuevoIndice, 0), PASOS_WIZARD.length - 1)),
    irAlPlan: () =>
      router.push(
        `/cuadrillas/${props.cuadrillaId}/paso/${props.paso.id}/plan`,
      ),
  };

  const propiedadesPaso = {
    estado,
    datos: props,
    factibilidad,
    cargando,
    aviso,
    error,
    acciones,
    actualizar,
  };

  return (
    <div className="flex flex-col gap-6">
      <Stepper
        steps={PASOS_WIZARD}
        current={indice}
        label="Pasos de la configuración del paso"
      />

      {aviso ? <Alert tone="success">{aviso}</Alert> : null}
      {error ? (
        <Alert tone="danger" title="No se ha podido guardar">
          <p>{error}</p>
        </Alert>
      ) : null}

      <div>
        {indice === 0 ? <PasoDatos {...propiedadesPaso} /> : null}
        {indice === 1 ? <PasoReparto {...propiedadesPaso} /> : null}
        {indice === 2 ? <PasoAsignacion {...propiedadesPaso} /> : null}
        {indice === 3 ? <PasoBoquillas {...propiedadesPaso} /> : null}
        {indice === 4 ? <PasoTramos {...propiedadesPaso} /> : null}
        {indice === 5 ? <PasoResumen {...propiedadesPaso} /> : null}
      </div>

      <nav
        aria-label="Navegación del wizard"
        className="flex items-center justify-between gap-2"
      >
        <Button
          variant="secondary"
          disabled={indice === 0}
          onClick={() => acciones.cambiarPaso(indice - 1)}
        >
          Atrás
        </Button>
        {indice < PASOS_WIZARD.length - 1 ? (
          <Button onClick={() => acciones.cambiarPaso(indice + 1)}>
            Siguiente
          </Button>
        ) : null}
      </nav>
    </div>
  );
}

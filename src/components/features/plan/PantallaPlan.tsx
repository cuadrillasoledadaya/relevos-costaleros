"use client";

/**
 * Pantalla principal del plan de relevos (P5, §9).
 *
 * Es un componente de cliente: el servidor le pasa el plan **ya leído de la
 * base de datos y verificado** (§11.3, S-5) y aquí sólo seputable lo que el
 * capataz puede hacer: calcular un plan nuevo, mirar el historial y publicar
 * una versión.
 *
 * El solver **no** corre en el navegador (§13.3): el cálculo va a la server
 * action `calcularPlan`, que usa el mismo servicio que la API.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Input,
  Tab,
  TabPanel,
  Tabs,
  TabsList,
} from "@/components/ui";
import type { DiagnosticoInfeasibilidad } from "@/domain/modelo";
import { calcularPlan, publicarPlan } from "@/server/actions/plan";
import { crearTramo } from "@/server/actions/tramo";

import { HistorialVersiones } from "./HistorialVersiones";
import { PanelEstadisticas } from "./PanelEstadisticas";
import { VistaPorCostalero } from "./VistaPorCostalero";
import { VistaPorTramo } from "./VistaPorTramo";
import type { DatosPantallaPlan } from "./tipos";

export type PropsPantallaPlan = DatosPantallaPlan & {
  cuadrillaId: string;
  pasoId: string;
};

type Pestana = "tramo" | "costalero" | "estadisticas" | "historial";

/** Pantalla principal del plan de relevos. */
export function PantallaPlan({
  cuadrillaId,
  pasoId,
  paso,
  trabajadoras,
  tramos,
  personas,
  versiones,
  plan,
  estadisticas,
  planCumple,
  semillaPorDefecto,
}: PropsPantallaPlan) {
  const router = useRouter();
  const [semilla, setSemilla] = useState(String(semillaPorDefecto));
  const [variasSemillas, setVariasSemillas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] =
    useState<DiagnosticoInfeasibilidad | null>(null);
  const [pestana, setPestana] = useState<Pestana>("tramo");

  /** Calcula el plan con la semilla elegida y lo guarda como versión nueva. */
  async function calcular(): Promise<void> {
    const base = Number.parseInt(semilla, 10);
    if (!Number.isInteger(base)) {
      setError("La semilla debe ser un número entero.");
      return;
    }
    setCargando(true);
    setError(null);
    setAviso(null);

    const semillas = variasSemillas
      ? [0, 1, 2, 3, 4].map((desplazamiento) => base + desplazamiento)
      : undefined;
    const resultado = await calcularPlan({ pasoId, seed: base, semillas });
    setCargando(false);

    if (resultado.ok) {
      setDiagnostico(null);
      setAviso(resultado.mensaje);
      router.refresh();
      return;
    }
    setDiagnostico(resultado.diagnostico ?? null);
    setError(resultado.error);
  }

  /** Publica la versión elegida para que la vean los costaleros. */
  async function publicar(planId: string): Promise<void> {
    setPublicando(true);
    setError(null);
    setAviso(null);

    const resultado = await publicarPlan({ planId });
    setPublicando(false);

    if (resultado.ok) {
      setAviso(resultado.mensaje);
      router.refresh();
      return;
    }
    setError(resultado.error);
  }

  /**
   * Aplica la sugerencia del diagnóstico y vuelve a calcular.
   *
   * Si lo que falta son tramos, los añade al recorrido y recalcula. Si lo que
   * falta es el pool, la carga o las boquillas, lleva al capataz a la
   * configuración del paso, que es donde se cambian.
   */
  async function aplicarSugerencia(): Promise<void> {
    if (!diagnostico) return;
    const faltan = diagnostico.cifras.tramosFaltantes ?? 0;
    if (faltan <= 0) {
      router.push(`/cuadrillas/${cuadrillaId}/paso/${pasoId}/configuracion`);
      return;
    }

    setCargando(true);
    setError(null);
    for (let indice = 0; indice < faltan; indice += 1) {
      const resultado = await crearTramo({
        pasoId,
        nombre: `Tramo ${String(tramos.length + indice + 1)}`,
      });
      if (!resultado.ok) {
        setCargando(false);
        setError(resultado.error);
        return;
      }
    }
    setCargando(false);
    await calcular();
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-titulo font-semibold text-fg">
            {`Plan de relevos · ${paso.name}`}
          </h1>
          <p className="text-pequeno text-fg-muted">
            {plan
              ? `Versión ${String(plan.version)} · semilla ${String(plan.seed)}`
              : "Todavía no hay ningún plan calculado."}
          </p>
        </div>
        {plan?.status === "publicado" ? (
          <Badge tone="success">Publicado</Badge>
        ) : plan ? (
          <Badge tone="warning">Borrador</Badge>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Calcular el plan de relevos</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-pequeno text-fg-muted">
                {`Semilla (${String(semillaPorDefecto)} por defecto)`}
                <Input
                  controlSize="sm"
                  type="number"
                  inputMode="numeric"
                  value={semilla}
                  onChange={(evento) => setSemilla(evento.target.value)}
                  className="w-40"
                  aria-label="Semilla del solver"
                />
              </label>
              <Button
                onClick={() => void calcular()}
                loading={cargando}
                loadingText="Calculando…"
              >
                Calcular plan de relevos
              </Button>
            </div>
            <Checkbox
              id="plan-varias-semillas"
              label="Probar varias semillas y quedarse con la mejor"
              description="Se prueban cinco semillas y se guarda la mejor por el orden de §8.2."
              checked={variasSemillas}
              onChange={(evento) => setVariasSemillas(evento.target.checked)}
            />
          </div>
        </CardBody>
      </Card>

      {aviso ? <Alert tone="success">{aviso}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {diagnostico ? (
        <Alert tone="warning" title="El plan no se puede calcular todavía">
          <p>{diagnostico.mensaje}</p>
          <p className="text-pequeno">{`Código: ${diagnostico.codigo}`}</p>
          <p>
            <strong>Sugerencia:</strong> {diagnostico.sugerencia}
          </p>
          <ul className="text-pequeno">
            {Object.entries(diagnostico.cifras).map(([clave, valor]) => (
              <li key={clave}>{`${clave}: ${String(valor)}`}</li>
            ))}
          </ul>
          <Button
            className="mt-2"
            variant="secondary"
            size="sm"
            onClick={() => void aplicarSugerencia()}
            loading={cargando}
            loadingText="Aplicando…"
          >
            Aplicar la sugerencia y recalcular
          </Button>
        </Alert>
      ) : null}

      {plan && !planCumple ? (
        <Alert tone="warning" title="Este plan ya no encaja con el paso">
          El plan guardado no supera la verificación de R1 a R4 con la
          configuración actual del paso, así que no se muestra. Calcula uno
          nuevo para seguir.
        </Alert>
      ) : null}

      {!plan ? (
        <EmptyState
          title="Todavía no hay plan de relevos"
          description="Pulsa «Calcular plan de relevos» para calcular el primero."
        />
      ) : planCumple ? (
        <Tabs
          value={pestana}
          onValueChange={(valor) => setPestana(valor as Pestana)}
        >
          <TabsList label="Vistas del plan de relevos">
            <Tab value="tramo">Por tramo</Tab>
            <Tab value="costalero">Por costalero</Tab>
            <Tab value="estadisticas">Estadísticas</Tab>
            <Tab value="historial">Historial</Tab>
          </TabsList>

          <TabPanel value="tramo">
            <div className="pt-3">
              <VistaPorTramo
                tramos={tramos}
                trabajadoras={trabajadoras}
                personas={personas}
                plan={plan}
              />
            </div>
          </TabPanel>

          <TabPanel value="costalero">
            <div className="pt-3">
              <VistaPorCostalero
                tramos={tramos}
                personas={personas}
                plan={plan}
              />
            </div>
          </TabPanel>

          <TabPanel value="estadisticas">
            <div className="pt-3">
              {estadisticas ? (
                <PanelEstadisticas
                  estadisticas={estadisticas}
                  personas={personas}
                  trabajadoras={trabajadoras}
                />
              ) : null}
            </div>
          </TabPanel>

          <TabPanel value="historial">
            <div className="pt-3">
              <HistorialVersiones
                versiones={versiones}
                versionVisibleId={plan.id}
                publicando={publicando}
                onPublicar={(planId) => void publicar(planId)}
              />
            </div>
          </TabPanel>
        </Tabs>
      ) : null}
    </div>
  );
}

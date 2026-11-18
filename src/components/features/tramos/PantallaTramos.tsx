"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableCell, TableRow } from "@/components/ui/Table";
import { TIPOS_TRAMO, type TipoTramo } from "@/domain/glosario";
import { evaluarFactibilidad } from "@/domain/factibilidad";
import {
  cambiarTipoTramo,
  crearTramo,
  eliminarTramo,
  reordenarTramos,
  renombrarTramo,
} from "@/server/actions/tramo";

import { FactibilidadTramos } from "./FactibilidadTramos";
import type {
  DatosPantallaTramos,
  ResultadoAccionTramos,
  TramoPantalla,
} from "./tipos";

const ERROR_NOMBRE_VACIO = "El nombre del tramo no puede estar vacío.";

function esTipoTramo(valor: string): valor is TipoTramo {
  return (
    valor === TIPOS_TRAMO.salida ||
    valor === TIPOS_TRAMO.normal ||
    valor === TIPOS_TRAMO.entrada
  );
}

/**
 * P4 — Apartado de tramos (§9).
 *
 * La lista local es una copia del recorrido que devuelve el servidor. Todas
 * las mutaciones llaman a las server actions y sustituyen la copia local por
 * el recorrido normalizado que devuelven. La factibilidad se evalúa con los
 * mismos datos, por lo que cambia en la misma interacción.
 */
export function PantallaTramos(props: DatosPantallaTramos) {
  const router = useRouter();
  const [tramos, setTramos] = useState<TramoPantalla[]>(() =>
    props.tramos.map((tramo) => ({ ...tramo })),
  );
  const [avisos, setAvisos] = useState(props.avisos);
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [tramoPendienteDeBorrado, setTramoPendienteDeBorrado] = useState<
    string | null
  >(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const factibilidad = useMemo(
    () =>
      evaluarFactibilidad({
        pasoId: props.paso.id,
        trabajaderas: props.trabajadoras.map((trabajadera) => ({
          id: trabajadera.id,
          position: trabajadera.position,
          carga: trabajadera.carga,
          pool: [...trabajadera.pool],
        })),
        tramos: tramos.map((tramo) => ({ ...tramo })),
        boquillas: [...props.boquillas],
      }),
    [props.boquillas, props.paso.id, props.trabajadoras, tramos],
  );

  const ejecutar = async (
    accion: () => Promise<ResultadoAccionTramos>,
  ): Promise<boolean> => {
    setCargando(true);
    setAviso(null);
    setError(null);
    try {
      const resultado = await accion();
      if (!resultado.ok) {
        setError(resultado.error);
        return false;
      }

      const nuevosTramos = resultado.datos.tramos.map((tramo) => ({
        ...tramo,
      }));
      setTramos(nuevosTramos);
      setAvisos(resultado.datos.avisos);
      setBorradores((actuales) => {
        const siguientes = { ...actuales };
        for (const tramo of nuevosTramos) {
          siguientes[tramo.id] = tramo.name;
        }
        for (const id of Object.keys(siguientes)) {
          if (!nuevosTramos.some((tramo) => tramo.id === id)) {
            delete siguientes[id];
          }
        }
        return siguientes;
      });
      setAviso(resultado.mensaje);
      router.refresh();
      return true;
    } catch {
      setError("No se ha podido modificar el recorrido.");
      return false;
    } finally {
      setCargando(false);
    }
  };

  const anadirTramo = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) {
      setError(ERROR_NOMBRE_VACIO);
      return;
    }

    const correcto = await ejecutar(() =>
      crearTramo({ pasoId: props.paso.id, nombre }),
    );
    if (correcto) setNombreNuevo("");
  };

  const guardarNombre = async (tramo: TramoPantalla) => {
    const nombre = (borradores[tramo.id] ?? tramo.name).trim();
    if (!nombre) {
      setError(ERROR_NOMBRE_VACIO);
      return;
    }

    await ejecutar(() =>
      renombrarTramo({
        pasoId: props.paso.id,
        tramoId: tramo.id,
        nombre,
      }),
    );
  };

  const moverTramo = (indice: number, desplazamiento: -1 | 1) => {
    const destino = indice + desplazamiento;
    if (destino < 0 || destino >= tramos.length) return;

    const orden = tramos.map((tramo) => tramo.id);
    const idActual = orden[indice];
    const idDestino = orden[destino];
    if (!idActual || !idDestino) return;
    orden[indice] = idDestino;
    orden[destino] = idActual;

    void ejecutar(() => reordenarTramos({ pasoId: props.paso.id, orden }));
  };

  const cambiarTipo = (tramo: TramoPantalla, valor: string) => {
    if (!esTipoTramo(valor)) return;
    void ejecutar(() =>
      cambiarTipoTramo({
        pasoId: props.paso.id,
        tramoId: tramo.id,
        tipo: valor,
      }),
    );
  };

  const confirmarBorrado = async () => {
    if (!tramoPendienteDeBorrado) return;
    await ejecutar(() =>
      eliminarTramo({
        pasoId: props.paso.id,
        tramoId: tramoPendienteDeBorrado,
      }),
    );
    setTramoPendienteDeBorrado(null);
  };

  const tramoPendiente = tramos.find(
    (tramo) => tramo.id === tramoPendienteDeBorrado,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-pequeno text-fg-muted">
          Paso «{props.paso.name}» · {props.paso.season}
        </p>
        <h1 className="text-titulo font-semibold text-fg">
          Apartado de tramos
        </h1>
        <p className="max-w-prose text-pequeno text-fg-muted">
          Crea y organiza los tramos del recorrido. El primero es la salida y el
          último es la entrada.
        </p>
      </header>

      {aviso ? <Alert tone="success">{aviso}</Alert> : null}
      {error ? (
        <Alert tone="danger" title="No se ha podido guardar el cambio">
          <p>{error}</p>
        </Alert>
      ) : null}
      {avisos.length > 0 ? (
        <Alert tone="warning" title="El recorrido necesita revisión">
          <ul className="list-disc pl-4">
            {avisos.map((avisoCoherencia) => (
              <li
                key={`${avisoCoherencia.id ?? "recorrido"}-${avisoCoherencia.mensaje}`}
              >
                {avisoCoherencia.mensaje}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Tramos del recorrido</CardTitle>
            <p className="text-pequeno text-fg-muted">
              Los cambios se guardan en el servidor. No se asignan ordinales
              desde la pantalla.
            </p>
          </CardHeader>
          <CardBody>
            <form
              className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface-sunken p-3 sm:flex-row sm:items-end"
              onSubmit={(evento) => void anadirTramo(evento)}
              noValidate
            >
              <FormField
                id="nombre-nuevo-tramo"
                label="Nombre del nuevo tramo"
                helper="Texto libre. El tramo se añadirá al final del recorrido."
                required
                className="w-full sm:flex-1"
              >
                <Input
                  name="nombre"
                  value={nombreNuevo}
                  onChange={(evento) => setNombreNuevo(evento.target.value)}
                  placeholder="Por ejemplo, vuelta a la plaza"
                  autoComplete="off"
                  disabled={cargando}
                  required
                />
              </FormField>
              <Button type="submit" loading={cargando}>
                Añadir tramo
              </Button>
            </form>

            {tramos.length === 0 ? (
              <EmptyState
                title="Todavía no hay tramos"
                description="Añade el primer tramo para empezar a construir el recorrido."
              />
            ) : (
              <Table
                caption="Tramos del recorrido"
                columns={[
                  { key: "ordinal", header: "#", align: "right" },
                  { key: "nombre", header: "Nombre" },
                  { key: "tipo", header: "Tipo" },
                  { key: "acciones", header: "Acciones" },
                ]}
              >
                {tramos.map((tramo, indice) => (
                  <TableRow key={tramo.id}>
                    <TableCell>{tramo.ordinal}</TableCell>
                    <TableCell>
                      <form
                        className="flex min-w-64 items-end gap-2"
                        onSubmit={(evento) => {
                          evento.preventDefault();
                          void guardarNombre(tramo);
                        }}
                        noValidate
                      >
                        <FormField
                          id={`nombre-tramo-${tramo.id}`}
                          label={`Nombre del tramo ${String(tramo.ordinal)}`}
                          className="min-w-48 flex-1"
                        >
                          <Input
                            aria-label={`Nombre del tramo ${String(tramo.ordinal)}`}
                            value={borradores[tramo.id] ?? tramo.name}
                            onChange={(evento) =>
                              setBorradores((actuales) => ({
                                ...actuales,
                                [tramo.id]: evento.target.value,
                              }))
                            }
                            disabled={cargando}
                          />
                        </FormField>
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          aria-label={`Guardar nombre del tramo ${String(tramo.ordinal)}`}
                          disabled={cargando}
                        >
                          Guardar
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell>
                      <FormField
                        id={`tipo-tramo-${tramo.id}`}
                        label={`Tipo del tramo ${String(tramo.ordinal)}`}
                      >
                        <Select
                          aria-label={`Tipo del tramo ${String(tramo.ordinal)}`}
                          value={tramo.kind}
                          onChange={(evento) =>
                            cambiarTipo(tramo, evento.target.value)
                          }
                          disabled={cargando}
                        >
                          <option value={TIPOS_TRAMO.salida}>salida</option>
                          <option value={TIPOS_TRAMO.normal}>normal</option>
                          <option value={TIPOS_TRAMO.entrada}>entrada</option>
                        </Select>
                      </FormField>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`Subir tramo ${String(tramo.ordinal)}`}
                          onClick={() => moverTramo(indice, -1)}
                          disabled={cargando || indice === 0}
                        >
                          Subir
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`Bajar tramo ${String(tramo.ordinal)}`}
                          onClick={() => moverTramo(indice, 1)}
                          disabled={cargando || indice === tramos.length - 1}
                        >
                          Bajar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          aria-label={`Eliminar tramo ${String(tramo.ordinal)}`}
                          onClick={() => setTramoPendienteDeBorrado(tramo.id)}
                          disabled={cargando}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </CardBody>
        </Card>

        <FactibilidadTramos
          factibilidad={factibilidad}
          trabajadoras={props.trabajadoras}
          totalTramos={tramos.length}
        />
      </div>

      <ConfirmDialog
        open={tramoPendiente !== undefined}
        onClose={() => {
          if (!cargando) setTramoPendienteDeBorrado(null);
        }}
        onConfirm={() => void confirmarBorrado()}
        title="Eliminar tramo"
        description={
          tramoPendiente
            ? `¿Seguro que quieres eliminar «${tramoPendiente.name}»? Esta acción no se puede deshacer.`
            : "¿Seguro que quieres eliminar este tramo? Esta acción no se puede deshacer."
        }
        confirmLabel="Eliminar tramo"
        cancelLabel="Cancelar"
        tone="danger"
        loading={cargando}
      />
    </div>
  );
}

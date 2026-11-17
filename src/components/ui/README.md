# Design system — «Relevos de costaleros»

Primitivas propias del proyecto (sin librerías de UI de terceros). Son **agnósticas del
dominio**: no conocen el vocabulario de §5/§6 de la spec (costalero, paso, trabajadera, tramo,
relevo, boquilla, capataz, cuadrilla). Los textos los pone quien compone la pantalla.

## Reglas de uso

1. **Ningún color literal** en un componente. Todo sale de los tokens de `src/app/globals.css`
   como utilidades Tailwind (`bg-surface`, `text-fg`, `border-border-strong`, `bg-primary`…).
   Hay un test automático que falla si aparece un `#hex` en `src/components/**`.
2. **Sin `any` y sin estilos inline.** Las props van tipadas; el ancho de un elemento que
   depende del estado se resuelve con clases (`data-[…]:…`), no con `style={{…}}`.
3. **Todo elemento interactivo es alcanzable y operable con teclado** y tiene foco visible
   (regla global `:focus-visible` en `globals.css`).
4. **Textos en español de España.** Los valores por defecto (p. ej. «Cargando…») son de la
   primitiva; los textos de dominio los recibe como props.

## Tokens

Definidos en `src/app/globals.css`:

| Grupo      | Variables                                                                                                       | Utilidades                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Color      | `--bg`, `--surface`, `--surface-sunken`, `--fg`, `--fg-muted`, `--border`, `--border-strong`, `--focus`         | `bg-bg`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-border`, …       |
| Estado     | `--primary`, `--danger`, `--success`, `--warning`, `--info` (+ `-hover`, `-active`, `-fg`, `-soft`, `-fg-soft`) | `bg-primary`, `text-primary-fg`, `bg-danger-soft`, `text-danger-fg-soft`, … |
| Tipografía | `--font-sans`, `--font-mono`, `--text-pequeno`, `--text-cuerpo`, `--text-cabecera`, `--text-titulo`             | `font-sans`, `text-pequeno`, `text-cuerpo`, `text-cabecera`, `text-titulo`  |
| Espaciado  | `--spacing` (base 4 px)                                                                                         | `p-2`, `gap-3`, …                                                           |
| Radios     | `--radius-xs` … `--radius-2xl`, `--radius-full`                                                                 | `rounded-md`, `rounded-full`, …                                             |
| Sombras    | `--shadow-xs` … `--shadow-xl`                                                                                   | `shadow-xs`, `shadow-lg`, …                                                 |
| Z-index    | `--z-index-header`, `--z-index-nav`, `--z-index-sheet`, `--z-index-dialog`, `--z-index-toast`                   | `z-header`, `z-dialog`, `z-toast`, …                                        |

El esquema oscuro se activa con `prefers-color-scheme: dark` (mismos nombres de token, así que
ningún componente cambia). El test `src/components/ui/__tests__/tokens.test.ts` comprueba el
contraste **AA** de todos los pares de texto y el de los bordes de control, en claro y en oscuro.

## Primitivas

| Componente                                                     | Fichero                                     | Notas                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Button`                                                       | `Button.tsx`                                | `variant` (primary/secondary/ghost/danger), `size`, `loading` (deshabilita y anuncia `aria-busy`)  |
| `IconButton`                                                   | `Button.tsx`                                | Exige `label` (nombre accesible)                                                                   |
| `Input` · `Textarea` · `Select`                                | `Input.tsx` · `Textarea.tsx` · `Select.tsx` | `controlSize`, `invalid`                                                                           |
| `Checkbox` · `Radio`/`RadioGroup` · `Switch`                   | `Checkbox.tsx` · `Radio.tsx` · `Switch.tsx` | Nativas o `role="switch"`; etiqueta y descripción asociadas                                        |
| `FormField`                                                    | `FormField.tsx`                             | Label + helper + error; conecta `htmlFor`, `aria-describedby` y `aria-invalid` con el control hijo |
| `Card` (+ `CardHeader`, `CardTitle`, `CardBody`, `CardFooter`) | `Card.tsx`                                  | Superficie con borde y sombra                                                                      |
| `Table` (+ `TableRow`, `TableCell`, `TableHeaderCell`)         | `Table.tsx`                                 | Ordenación por cabecera (`sort` + `onSortChange`) y scroll horizontal en móvil                     |
| `Tabs` (`TabsList`, `Tab`, `TabPanel`)                         | `Tabs.tsx`                                  | `tablist`/`tab`/`tabpanel`, flechas izquierda/derecha                                              |
| `Dialog`                                                       | `Dialog.tsx`                                | Modal: foco atrapado, `Esc` cierra, devuelve el foco al abrirse                                    |
| `Sheet`                                                        | `Sheet.tsx`                                 | Panel inferior (patrón móvil) con el mismo comportamiento de foco                                  |
| `ConfirmDialog`                                                | `ConfirmDialog.tsx`                         | `Dialog` con acciones de confirmar/cancelar                                                        |
| `Badge` · `Tag`                                                | `Badge.tsx`                                 | Estado no interactivo / etiqueta removible                                                         |
| `Avatar`                                                       | `Avatar.tsx`                                | Iniciales a partir del nombre                                                                      |
| `Toast` (+ `ToastProvider`, `useToast`)                        | `Toast.tsx`                                 | Región `aria-live`; `useToast().show(mensaje, { tone })`                                           |
| `Alert`                                                        | `Alert.tsx`                                 | `role="alert"` en peligro/aviso, `role="status"` en el resto                                       |
| `Stepper`                                                      | `Stepper.tsx`                               | Barra de progreso del wizard con `aria-current="step"`                                             |
| `EmptyState`                                                   | `EmptyState.tsx`                            | Estado vacío con CTA                                                                               |
| `Skeleton` · `Spinner`                                         | `Skeleton.tsx` · `Spinner.tsx`              | Estados de carga                                                                                   |
| `Pagination`                                                   | `Pagination.tsx`                            | «Página X de Y» con botones etiquetados                                                            |
| `Icono`                                                        | `Icono.tsx`                                 | Catálogo de iconos propio (24×24, trazo)                                                           |

Todas se importan desde el barril:

```ts
import { Button, FormField, Input, type Tone } from "@/components/ui";
```

> Nota: dentro de `src/components/**` se usan **imports relativos** (`../ui/Button`) porque el
> alias `@/*` no está configurado en `vitest.config.ts` (fichero del orquestador) y los tests de
> componentes no lo resolverían.

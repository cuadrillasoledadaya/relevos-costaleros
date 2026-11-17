/**
 * Design system propio de "Relevos de costaleros".
 *
 * Las primitivas de esta carpeta son agnósticas del dominio: no conocen el
 * vocabulario de costaleros, pasos, trabajaderas ni relevos (ver §13.1 de la
 * spec). Los textos los pone quien compone la pantalla.
 */

export { Alert, type AlertProps } from "./Alert";
export { Avatar, iniciales, type AvatarProps, type AvatarSize } from "./Avatar";
export { Badge, Tag, type BadgeProps, type TagProps } from "./Badge";
export {
  BotonConIcono,
  Button,
  IconButton,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  type IconButtonProps,
} from "./Button";
export {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps,
  type CardSectionProps,
} from "./Card";
export { Checkbox, type CheckboxProps } from "./Checkbox";
export { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";
export { Dialog, type DialogProps, type DialogSize } from "./Dialog";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { FormField, type FormFieldProps } from "./FormField";
export { Icono } from "./Icono";
export { Input, type InputProps } from "./Input";
export { Pagination, type PaginationProps } from "./Pagination";
export {
  Radio,
  RadioGroup,
  type RadioGroupProps,
  type RadioProps,
} from "./Radio";
export { Select, type SelectProps } from "./Select";
export { Sheet, type SheetProps } from "./Sheet";
export { Skeleton, type SkeletonProps } from "./Skeleton";
export { Spinner, type SpinnerProps, type SpinnerSize } from "./Spinner";
export { Stepper, type StepperProps, type StepperStep } from "./Stepper";
export {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
  type TableColumn,
  type TableProps,
  type TableRowProps,
  type TableSort,
} from "./Table";
export { Tabs, Tab, TabPanel, TabsList } from "./Tabs";
export { Textarea, type TextareaProps } from "./Textarea";
export {
  Toast,
  ToastProvider,
  useToast,
  type ToastItem,
  type ToastOptions,
  type ToastProps,
  type ToastProviderProps,
  type ToastTone,
} from "./Toast";
export {
  cn,
  type ControlSize,
  type IconName,
  type IconProps,
  type Tone,
} from "./types";

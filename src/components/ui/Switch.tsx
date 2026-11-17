"use client";

import { useId } from "react";

import { cn } from "./types";

export type SwitchProps = {
  /** Texto visible del interruptor. */
  label: React.ReactNode;
  /** Texto adicional bajo la etiqueta. */
  description?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
};

/**
 * Interruptor (role="switch"). Es un `button`, por lo que funciona con teclado
 * y con lectores de pantalla sin código extra.
 */
export function Switch({
  label,
  description,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  id,
  className,
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;
  const isControlled = checked !== undefined;
  const isOn = isControlled ? checked : defaultChecked;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={isOn}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => {
          if (!isControlled) return;
          onCheckedChange?.(!isOn);
        }}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          isOn
            ? "border-primary bg-primary"
            : "border-border-strong bg-surface-sunken",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-4 rounded-full bg-surface shadow-xs transition-transform",
            isOn ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
      <div className="flex flex-col">
        <label htmlFor={switchId} className="text-cuerpo text-fg">
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="text-pequeno text-fg-muted">
            {description}
          </span>
        ) : null}
      </div>
    </div>
  );
}

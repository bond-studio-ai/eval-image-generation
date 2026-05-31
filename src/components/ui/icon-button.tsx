"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";
import { TooltipWrap } from "./tooltip";

export type IconButtonVariant = "default" | "danger" | "subtle";
export type IconButtonSize = "sm" | "md";

const VARIANT: Record<IconButtonVariant, string> = {
  default: "text-text-disabled hover:bg-surface-sunken hover:text-text-secondary focus-visible:outline-primary-600",
  danger: "text-text-disabled hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-danger-600",
  subtle: "text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-primary-600"
};

const SIZE: Record<IconButtonSize, string> = {
  sm: "p-1 [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "p-1.5 [&_svg]:h-4 [&_svg]:w-4"
};

const BASE = "inline-flex items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Required accessible label; also used as tooltip. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Icon-only square button with a hover tooltip and required `label` for a11y.
 * Replaces the bespoke `ActionButton` inside `actionsColumn` and the various
 * inline icon buttons (delete batch, retry, clear, etc.) across the app.
 */
export function IconButton({ label, icon, variant = "default", size = "md", loading = false, disabled, className, type = "button", ref, ...rest }: IconButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TooltipWrap content={label} side="top">
      <button ref={ref} type={type} disabled={isDisabled} aria-label={label} className={cn(BASE, VARIANT[variant], SIZE[size], className)} {...rest}>
        {loading ? <Spinner size="xs" /> : icon}
      </button>
    </TooltipWrap>
  );
}

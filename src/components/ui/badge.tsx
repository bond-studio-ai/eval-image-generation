import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";
export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

/**
 * Single, unified badge primitive. Replaces:
 * - `StatusBadge` (active/inactive/deleted)
 * - `ReviewStatusBadge` (running/pending/in_progress/reviewed)
 * - inline source / judge / multi-strategy pills sprinkled across pages
 *
 * Pick the right tone for the signal you want to convey, not the color you
 * happen to like — the design system standardizes the mapping.
 */
const SOFT: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-text-secondary ring-1 ring-inset ring-border",
  info: "bg-info-50 text-info-700 ring-1 ring-inset ring-info-600/20",
  success: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-600/20",
  warning: "bg-warning-50 text-warning-800 ring-1 ring-inset ring-warning-600/30",
  danger: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-600/20",
  accent: "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-600/20"
};

const SOLID: Record<BadgeTone, string> = {
  neutral: "bg-text-secondary text-text-inverse",
  info: "bg-info-600 text-text-inverse",
  success: "bg-success-600 text-text-inverse",
  warning: "bg-warning-500 text-text-inverse",
  danger: "bg-danger-600 text-text-inverse",
  accent: "bg-accent-600 text-text-inverse"
};

const OUTLINE: Record<BadgeTone, string> = {
  neutral: "text-text-secondary ring-1 ring-inset ring-border-strong",
  info: "text-info-700 ring-1 ring-inset ring-info-600/40",
  success: "text-success-700 ring-1 ring-inset ring-success-600/40",
  warning: "text-warning-800 ring-1 ring-inset ring-warning-600/40",
  danger: "text-danger-700 ring-1 ring-inset ring-danger-600/40",
  accent: "text-accent-700 ring-1 ring-inset ring-accent-600/40"
};

const SIZE: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0 text-[10px] font-medium",
  md: "px-2 py-0.5 text-caption font-medium"
};

const PALETTE_BY_VARIANT: Record<BadgeVariant, Record<BadgeTone, string>> = {
  solid: SOLID,
  outline: OUTLINE,
  soft: SOFT
};

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  iconLeft?: ReactNode;
  children: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

export function Badge({ tone = "neutral", variant = "soft", size = "md", iconLeft, className, children, ref, ...rest }: BadgeProps) {
  const palette = PALETTE_BY_VARIANT[variant];
  return (
    <span ref={ref} className={cn("rounded-pill inline-flex items-center gap-1 whitespace-nowrap", palette[tone], SIZE[size], className)} {...rest}>
      {iconLeft && <span className="flex shrink-0 items-center">{iconLeft}</span>}
      {children}
    </span>
  );
}

import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "./cn";

type CardPadding = "sm" | "md" | "lg" | "none";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Outer padding for the card body. Use `none` when nesting a custom layout. */
  padding?: CardPadding;
  /** Drop the default border for cases where the parent already supplies one. */
  borderless?: boolean;
  /** Hover elevation cue (use sparingly; only on clickable cards). */
  interactive?: boolean;
  ref?: Ref<HTMLDivElement>;
}

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6"
};

/**
 * Standard card surface. Replaces the
 * `rounded-lg border border-border bg-surface p-6 shadow-xs` snippet that's
 * copy-pasted across pages.
 */
export function Card({ padding = "lg", borderless = false, interactive = false, className, ref, ...rest }: CardProps) {
  return <div ref={ref} className={cn("rounded-card bg-surface shadow-card", !borderless && "border-border border", PADDING[padding], interactive && "hover:shadow-card-hover transition-shadow", className)} {...rest} />;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/**
 * Compact statistic card for dashboards (Total Generations, Rated, etc.).
 * Standardizes the large-number display pattern that was duplicated on the
 * Analytics home.
 */
export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <Card padding="lg" className={className}>
      <p className="text-caption text-text-secondary font-medium">{label}</p>
      <p className="text-display text-text-primary mt-2 font-bold">{value}</p>
      {hint && <p className="text-caption text-text-muted mt-1">{hint}</p>}
    </Card>
  );
}

import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "./cn";

export type BannerTone = "neutral" | "info" | "success" | "warning" | "danger";

const SURFACE: Record<BannerTone, string> = {
  neutral: "border-border bg-surface-muted text-text-primary",
  info: "border-info-200 bg-info-50 text-info-800",
  success: "border-success-600/30 bg-success-50 text-success-800",
  warning: "border-warning-200 bg-warning-50 text-warning-800",
  danger: "border-danger-200 bg-danger-50 text-danger-800"
};

const ICON_COLOR: Record<BannerTone, string> = {
  neutral: "text-text-secondary",
  info: "text-info-700",
  success: "text-success-700",
  warning: "text-warning-700",
  danger: "text-danger-700"
};

const DESCRIPTION_COLOR: Record<BannerTone, string> = {
  neutral: "text-text-muted",
  info: "text-info-700",
  success: "text-success-700",
  warning: "text-warning-700",
  danger: "text-danger-700"
};

interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  tone?: BannerTone;
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Right-side slot (buttons, badges, etc.). */
  actions?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Inline status banner. Use for selection confirmations, transient process
 * indicators, and lightweight callouts above or inside forms. Avoid stacking
 * raw `bg-*-50` divs across the app — reach for this primitive instead.
 *
 * For floating notifications, use `toast` from this module. For form errors,
 * use `<ErrorCard>` from `@/components/resource-form-header` (which is still
 * the canonical "something is wrong, fix it before submitting" surface).
 */
export function Banner({ tone = "neutral", icon, title, description, actions, className, ref, ...rest }: BannerProps) {
  return (
    <div ref={ref} className={cn("flex flex-wrap items-center gap-3 rounded-md border px-4 py-2.5", SURFACE[tone], className)} {...rest}>
      {icon && <span className={cn("flex shrink-0 items-center", ICON_COLOR[tone])}>{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="text-body font-semibold">{title}</p>}
        {description && <p className={cn("text-caption", title ? "mt-0.5" : "", DESCRIPTION_COLOR[tone])}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

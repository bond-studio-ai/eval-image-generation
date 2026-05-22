import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

type CardPadding = 'sm' | 'md' | 'lg' | 'none';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Outer padding for the card body. Use `none` when nesting a custom layout. */
  padding?: CardPadding;
  /** Drop the default border for cases where the parent already supplies one. */
  borderless?: boolean;
  /** Hover elevation cue (use sparingly; only on clickable cards). */
  interactive?: boolean;
}

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

/**
 * Standard card surface. Replaces the
 * `rounded-lg border border-gray-200 bg-white p-6 shadow-xs` snippet that's
 * copy-pasted across pages.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'lg', borderless = false, interactive = false, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-card bg-surface shadow-card',
        !borderless && 'border-border border',
        PADDING[padding],
        interactive && 'hover:shadow-card-hover transition-shadow',
        className,
      )}
      {...rest}
    />
  );
});

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/**
 * Optional card header. Renders title + description on the left and an actions
 * slot on the right. Place above `<CardBody>` when needed; many cards just
 * inline a heading instead.
 */
export function CardHeader({
  title,
  description,
  actions,
  className,
  children,
  ...rest
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'border-border-subtle flex items-start justify-between gap-4 border-b px-5 py-4',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0">
        {title && <h3 className="text-h3 text-text-primary font-semibold">{title}</h3>}
        {description && <p className="text-caption text-text-secondary mt-0.5">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4',
        className,
      )}
      {...rest}
    />
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/**
 * Compact statistic card for dashboards (Total Generations, Rated, etc.).
 * Standardizes the `text-3xl font-bold` pattern that was duplicated on the
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

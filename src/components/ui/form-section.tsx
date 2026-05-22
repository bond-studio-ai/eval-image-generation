import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

interface FormSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Right-side header slot (e.g. "Add step" button). */
  actions?: ReactNode;
  /** Children render inside the body region. */
  children: ReactNode;
}

/**
 * A titled section card for resource forms. Use to visually rhythm long
 * forms (Strategy builder, Catalog prompt builder, etc.) instead of stacking
 * unlabeled `<div>`s. Pair with `<ResourceFormHeader>` at the top of the page.
 */
export function FormSection({
  title,
  description,
  actions,
  className,
  children,
  ...rest
}: FormSectionProps) {
  return (
    <section
      className={cn('rounded-card border-border bg-surface shadow-card border', className)}
      {...rest}
    >
      <header className="border-border-subtle flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-h3 text-text-primary font-semibold">{title}</h2>
          {description && <p className="text-caption text-text-secondary mt-1">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

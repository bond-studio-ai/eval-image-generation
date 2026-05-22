import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './ui/cn';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Custom illustration / icon. Defaults to a neutral inbox glyph. */
  icon?: ReactNode;
  /** Action(s) to render below the description (e.g. a `<LinkButton>`). */
  action?: ReactNode;
  className?: string;
  tone?: 'neutral' | 'subtle';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  tone = 'neutral',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-card flex flex-col items-center justify-center border-2 border-dashed px-6 py-16 text-center',
        tone === 'neutral' ? 'border-border-strong' : 'border-border bg-surface-muted',
        className,
      )}
    >
      <div className="text-text-disabled" aria-hidden="true">
        {icon ?? <Inbox className="h-12 w-12" strokeWidth={1.25} />}
      </div>
      <h3 className="text-body text-text-primary mt-4 font-semibold">{title}</h3>
      {description && <div className="text-body text-text-secondary mt-1">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

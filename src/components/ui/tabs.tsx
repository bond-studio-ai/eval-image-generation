import Link from 'next/link';
import { cn } from './cn';

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  href?: string;
  count?: number;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange?: (key: T) => void;
  className?: string;
  /** Aria-label for the tablist. */
  label?: string;
}

/**
 * Underline tab navigation. Replaces the four hand-rolled `border-b-2`
 * implementations across the app. Each tab is rendered as a `<Link>` when an
 * `href` is provided; otherwise as a button calling `onChange`.
 */
export function Tabs<T extends string>({
  items,
  active,
  onChange,
  className,
  label,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('border-border flex gap-1 border-b', className)}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        const classes = cn(
          'border-b-2 px-4 py-2.5 text-body font-medium transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
          isActive
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-text-muted hover:border-border-strong hover:text-text-secondary',
          item.disabled && 'pointer-events-none opacity-50',
        );
        const content = (
          <>
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-pill ml-2 inline-flex min-w-[20px] items-center justify-center px-1.5 text-[11px] font-semibold',
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-surface-sunken text-text-muted',
                )}
              >
                {item.count}
              </span>
            )}
          </>
        );
        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              role="tab"
              aria-selected={isActive}
              aria-disabled={item.disabled}
              className={classes}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => onChange?.(item.key)}
            className={classes}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

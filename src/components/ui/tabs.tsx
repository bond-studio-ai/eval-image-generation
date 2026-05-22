import Link from 'next/link';
import type { ReactNode } from 'react';
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
  /** Accessible name for the navigation region. */
  label?: string;
}

/**
 * Underline page navigation. Visually a tab strip, but semantically these are
 * route or view switches that do not manage `tabpanel` elements or roving
 * focus, so we use plain navigation semantics:
 *
 * - `href` items render as `<Link>` with `aria-current="page"` for the active
 *   route. The whole strip is wrapped in `<nav>` so screen readers announce it
 *   as page navigation.
 * - `onChange` items render as toggle buttons with `aria-pressed`, which is
 *   the right pattern for switching views without an associated tabpanel.
 * - Disabled items render as a non-interactive `<span aria-disabled="true">`
 *   so keyboard activation cannot navigate or toggle them. They stay visible
 *   in the strip so users can still see "this option exists but is off".
 *
 * If you ever need real ARIA tabs (with `tabpanel`, arrow-key roving focus,
 * and `aria-controls`), build a separate `RealTabs` primitive — that contract
 * is materially different from page navigation.
 */
export function Tabs<T extends string>({
  items,
  active,
  onChange,
  className,
  label,
}: TabsProps<T>) {
  const classesFor = (isActive: boolean, disabled: boolean | undefined) =>
    cn(
      'border-b-2 px-4 py-2.5 text-body font-medium transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
      isActive
        ? 'border-primary-600 text-primary-700'
        : 'border-transparent text-text-muted hover:border-border-strong hover:text-text-secondary',
      disabled && 'cursor-not-allowed opacity-50',
    );

  const renderContent = (item: TabItem<T>, isActive: boolean) => (
    <>
      {item.label}
      {typeof item.count === 'number' && (
        <span
          className={cn(
            'rounded-pill ml-2 inline-flex min-w-[20px] items-center justify-center px-1.5 text-[11px] font-semibold',
            isActive ? 'bg-primary-100 text-primary-700' : 'bg-surface-sunken text-text-muted',
          )}
        >
          {item.count}
        </span>
      )}
    </>
  );

  /**
   * Renders a single item with the right element for its state. A disabled
   * item never becomes a real link or button — that's the only reliable way
   * to block keyboard Enter/Space activation while leaving the item visible.
   */
  const renderItem = (item: TabItem<T>): ReactNode => {
    const isActive = item.key === active;
    const inner = renderContent(item, isActive);
    const classes = classesFor(isActive, item.disabled);

    if (item.disabled) {
      // A non-interactive `<span>` is the only way to reliably block keyboard
      // Enter/Space activation while keeping the item visible. `aria-disabled`
      // would not be meaningful here because the element has no interactive
      // role and is not in the tab order; screen readers correctly skip it.
      return (
        <span key={item.key} className={classes}>
          {inner}
        </span>
      );
    }

    if (item.href) {
      return (
        <Link
          key={item.key}
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          className={classes}
        >
          {inner}
        </Link>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        aria-pressed={isActive}
        onClick={() => onChange?.(item.key)}
        className={classes}
      >
        {inner}
      </button>
    );
  };

  // All non-disabled items are link-based: render as a nav landmark.
  const navigable = items.filter((item) => !item.disabled);
  const allLinks = navigable.length > 0 && navigable.every((item) => item.href !== undefined);

  if (allLinks) {
    return (
      <nav aria-label={label} className={cn('border-border flex gap-1 border-b', className)}>
        {items.map(renderItem)}
      </nav>
    );
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('border-border flex gap-1 border-b', className)}
    >
      {items.map(renderItem)}
    </div>
  );
}

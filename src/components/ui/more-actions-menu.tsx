'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from './cn';
import { MoreHorizontalIcon } from './icons';

export interface MoreAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface MoreActionsMenuProps {
  actions: MoreAction[];
  /** Visible label for assistive tech. */
  label?: string;
  align?: 'start' | 'end';
}

/**
 * Compact overflow menu that condenses secondary actions into a single
 * trigger. Useful on detail-page headers that would otherwise crowd four or
 * more buttons inline.
 */
export function MoreActionsMenu({
  actions,
  label = 'More actions',
  align = 'end',
}: MoreActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-button border-border-strong bg-surface text-text-secondary inline-flex h-9 w-9 items-center justify-center border shadow-xs transition-colors',
          'hover:bg-surface-muted focus-visible:outline-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          open && 'bg-surface-muted',
        )}
      >
        <MoreHorizontalIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'rounded-card border-border bg-surface shadow-popover absolute z-40 mt-1 min-w-[200px] overflow-hidden border',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <ul className="py-1">
            {actions.map((action) => (
              <li key={action.key}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  className={cn(
                    'text-body flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                    'hover:bg-surface-muted focus:bg-surface-muted focus:outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    action.destructive
                      ? 'text-danger-600 hover:bg-danger-50 focus:bg-danger-50'
                      : 'text-text-primary',
                  )}
                >
                  {action.icon && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {action.icon}
                    </span>
                  )}
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

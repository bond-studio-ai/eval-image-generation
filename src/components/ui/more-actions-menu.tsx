'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
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
 *
 * Implements the WAI-ARIA Authoring Practices `menu` keyboard contract:
 * - Trigger toggles with Enter/Space/click. ArrowDown on the trigger opens
 *   the menu and focuses the first item; ArrowUp opens and focuses the last.
 * - Inside the menu: ArrowDown/ArrowUp move between items (wrapping), Home
 *   and End jump to first/last, Tab and Escape close the menu and return
 *   focus to the trigger. Enter/Space on a focused item activates it.
 * - Disabled items are skipped during arrow-key navigation.
 */
export function MoreActionsMenu({
  actions,
  label = 'More actions',
  align = 'end',
}: MoreActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndices = useMemo(
    () => actions.map((a, i) => (a.disabled ? -1 : i)).filter((i): i is number => i >= 0),
    [actions],
  );

  // Outside click / Escape (when not handled inside menu) close handlers.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  // Move DOM focus to the active menu item whenever it changes while open.
  useEffect(() => {
    if (!open) return;
    if (activeIndex < 0) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const openWithFirst = useCallback(() => {
    if (enabledIndices.length === 0) return;
    setOpen(true);
    setActiveIndex(enabledIndices[0]);
  }, [enabledIndices]);

  const openWithLast = useCallback(() => {
    if (enabledIndices.length === 0) return;
    setOpen(true);
    setActiveIndex(enabledIndices[enabledIndices.length - 1]);
  }, [enabledIndices]);

  const moveBy = useCallback(
    (delta: 1 | -1) => {
      if (enabledIndices.length === 0) return;
      const pos = enabledIndices.indexOf(activeIndex);
      const nextPos =
        pos < 0
          ? delta === 1
            ? 0
            : enabledIndices.length - 1
          : (pos + delta + enabledIndices.length) % enabledIndices.length;
      setActiveIndex(enabledIndices[nextPos]);
    },
    [activeIndex, enabledIndices],
  );

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (open) moveBy(1);
        else openWithFirst();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (open) moveBy(-1);
        else openWithLast();
        break;
      }
      case 'Escape': {
        if (open) {
          e.preventDefault();
          closeAndReturnFocus();
        }
        break;
      }
      default:
        break;
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveBy(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveBy(-1);
        break;
      case 'Home':
        if (enabledIndices.length > 0) {
          e.preventDefault();
          setActiveIndex(enabledIndices[0]);
        }
        break;
      case 'End':
        if (enabledIndices.length > 0) {
          e.preventDefault();
          setActiveIndex(enabledIndices[enabledIndices.length - 1]);
        }
        break;
      case 'Escape':
      case 'Tab': {
        // Both keys close the menu. Escape returns focus to the trigger;
        // Tab is allowed to proceed so focus moves to the next document
        // tabstop (matching menu-button behavior in the WAI-ARIA APG).
        if (e.key === 'Escape') {
          e.preventDefault();
          closeAndReturnFocus();
        } else {
          setOpen(false);
          setActiveIndex(-1);
        }
        break;
      }
      default:
        break;
    }
  };

  const handleTriggerClick = () => {
    if (open) {
      closeAndReturnFocus();
    } else {
      openWithFirst();
    }
  };

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'rounded-button border-border-strong bg-surface text-text-secondary inline-flex size-9 items-center justify-center border shadow-xs transition-colors',
          'hover:bg-surface-muted focus-visible:outline-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          open && 'bg-surface-muted',
        )}
      >
        <MoreHorizontalIcon className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'rounded-card border-border bg-surface shadow-popover absolute z-40 mt-1 min-w-[200px] overflow-hidden border',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <ul className="py-1">
            {actions.map((action, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={action.key} role="none">
                  <button
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={isActive ? 0 : -1}
                    aria-disabled={action.disabled || undefined}
                    disabled={action.disabled}
                    onClick={() => {
                      if (action.disabled) return;
                      setOpen(false);
                      setActiveIndex(-1);
                      action.onClick();
                    }}
                    onMouseEnter={() => {
                      if (!action.disabled) setActiveIndex(index);
                    }}
                    className={cn(
                      'text-body flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                      'focus:outline-none',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      action.destructive
                        ? 'text-danger-600 hover:bg-danger-50 focus:bg-danger-50'
                        : 'text-text-primary hover:bg-surface-muted focus:bg-surface-muted',
                    )}
                  >
                    {action.icon && (
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

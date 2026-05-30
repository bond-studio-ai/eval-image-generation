'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from './button';
import { cn } from './cn';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use 'danger' for destructive actions (delete, etc.). */
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

/**
 * Mounts the confirm dialog and exposes `useConfirm()` to descendants.
 * Use as a thin replacement for `window.confirm()` so destructive actions
 * pause through a styled modal instead of a native browser prompt.
 *
 * The pending resolver lives in a ref rather than in state. If `confirm()` is
 * called while another dialog is already open, the prior promise is settled
 * with `false` (treated as a cancel) before the new dialog replaces it, so
 * callers awaiting the original promise never hang.
 */
/**
 * Selector for elements considered focusable by the focus trap. Mirrors the
 * common "tabbable" set; the trap further filters by visibility and the
 * `disabled` attribute.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return all.filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.tabIndex < 0) return false;
    // Skip elements rendered with display:none or visibility:hidden.
    return el.offsetParent !== null || el === document.activeElement;
  });
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  /**
   * Settle the currently pending confirm (if any) with `value`, then forget
   * the resolver. Safe to call multiple times — idempotent after the first.
   */
  const settlePending = useCallback((value: boolean) => {
    const resolver = resolverRef.current;
    if (resolver) {
      resolverRef.current = null;
      resolver(value);
    }
  }, []);

  const confirm = useCallback<ConfirmFn>(
    (options) => {
      // If a previous dialog is still open, the new caller has interrupted it.
      // Treat the original prompt as cancelled so its caller's promise resolves
      // and any follow-on "loading" UI clears, instead of hanging forever.
      settlePending(false);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setState({ ...options, open: true });
      });
    },
    [settlePending],
  );

  const close = useCallback(
    (value: boolean) => {
      settlePending(value);
      setState((s) => ({ ...s, open: false }));
    },
    [settlePending],
  );

  // Settle any still-pending resolver if the provider unmounts so callers
  // don't hang past the lifetime of the component tree.
  useEffect(() => {
    return () => {
      settlePending(false);
    };
  }, [settlePending]);

  // Escape always cancels, regardless of focus. Enter is intentionally NOT
  // handled at the window level — we let the natural button activation drive
  // confirm/cancel based on focus, and we set a tone-aware initial focus
  // (Cancel for destructive actions, Confirm for benign ones) so a user
  // pressing Enter without first tabbing always gets the safe outcome.
  //
  // Tab/Shift+Tab is intercepted to keep focus inside the dialog. We also
  // remember the element that had focus before the dialog opened and restore
  // it on close, so keyboard flow returns the user where they were.
  useEffect(() => {
    if (!state.open) return;

    // Snapshot the dialog root and the previously-focused element at effect
    // setup time. Both are stable for the lifetime of this open cycle and
    // are needed by the cleanup function, so capturing them in locals also
    // satisfies the react-hooks/exhaustive-deps stale-ref guard.
    const root = dialogRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previouslyFocusedRef.current = previouslyFocused;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close(false);
        return;
      }
      if (e.key !== 'Tab' || !root) return;

      const focusables = getFocusable(root);
      if (focusables.length === 0) {
        // No focusable children — keep focus on the dialog itself.
        e.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const insideDialog = !!active && root.contains(active);

      if (e.shiftKey) {
        if (!insideDialog || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!insideDialog || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);

    if (state.tone === 'danger') {
      cancelButtonRef.current?.focus();
    } else {
      confirmButtonRef.current?.focus();
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      // Restore focus to whatever was focused before the dialog opened, but
      // only if focus is still inside the dialog (or nowhere) — don't yank
      // focus away from anything the user explicitly focused after close.
      const active = document.activeElement;
      const focusEscaped = active && active !== document.body && (!root || !root.contains(active));
      if (!focusEscaped && previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [state.open, state.tone, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => close(false)}
          />
          <dialog
            ref={dialogRef}
            open
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            tabIndex={-1}
            className={cn('rounded-card bg-surface shadow-modal relative m-0 w-full max-w-md p-6')}
          >
            <h2 id="confirm-dialog-title" className="text-h3 text-text-primary font-semibold">
              {state.title}
            </h2>
            {state.description && (
              <div className="text-body text-text-secondary mt-2">{state.description}</div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelButtonRef} variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                ref={confirmButtonRef}
                variant={state.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {state.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </dialog>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * `const confirm = useConfirm(); if (await confirm({ title: '...' })) { ... }`
 *
 * Throws if used outside `<ConfirmProvider>`.
 */
export function useConfirm(): ConfirmFn {
  const ctx = use(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}

/** Stable empty fallback for places that haven't been wrapped yet. */
export function useConfirmFallback() {
  return useMemo(
    () => async (opts: ConfirmOptions) =>
      typeof window !== 'undefined' &&
      window.confirm(`${opts.title}${opts.description ? `\n\n${String(opts.description)}` : ''}`),
    [],
  );
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
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
  resolve?: (value: boolean) => void;
}

/**
 * Mounts the confirm dialog and exposes `useConfirm()` to descendants.
 * Use as a thin replacement for `window.confirm()` so destructive actions
 * pause through a styled modal instead of a native browser prompt.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '' });
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const close = useCallback(
    (value: boolean) => {
      state.resolve?.(value);
      setState((s) => ({ ...s, open: false, resolve: undefined }));
    },
    [state],
  );

  // Escape always cancels, regardless of focus. Enter is intentionally NOT
  // handled at the window level — we let the natural button activation drive
  // confirm/cancel based on focus, and we set a tone-aware initial focus
  // (Cancel for destructive actions, Confirm for benign ones) so a user
  // pressing Enter without first tabbing always gets the safe outcome.
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    if (state.tone === 'danger') {
      cancelButtonRef.current?.focus();
    } else {
      confirmButtonRef.current?.focus();
    }
    return () => window.removeEventListener('keydown', onKey);
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className={cn('rounded-card bg-surface shadow-modal relative w-full max-w-md p-6')}
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
          </div>
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
  const ctx = useContext(ConfirmContext);
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

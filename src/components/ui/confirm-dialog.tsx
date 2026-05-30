'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from './button';
import { Modal } from './modal';

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
 *
 * Overlay mechanics (backdrop, Escape, focus trap, focus restoration) come from
 * the shared `<Modal>` primitive; here we only add tone-aware initial focus so a
 * user who hits Enter without tabbing always gets the safe outcome (Cancel for
 * destructive actions, Confirm for benign ones).
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
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

  const cancel = useCallback(() => close(false), [close]);

  // Settle any still-pending resolver if the provider unmounts so callers
  // don't hang past the lifetime of the component tree.
  useEffect(() => {
    return () => {
      settlePending(false);
    };
  }, [settlePending]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <Modal
          onClose={cancel}
          labelledById="confirm-dialog-title"
          className="max-w-md p-6"
          initialFocusRef={state.tone === 'danger' ? cancelButtonRef : confirmButtonRef}
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
        </Modal>
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

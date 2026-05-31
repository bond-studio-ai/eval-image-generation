"use client";

import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast container. Mounts once in the root layout. Use `toast` from
 * this module anywhere in the tree to fire notifications.
 */
export function ToasterProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "rounded-card border border-border bg-surface text-text-primary shadow-popover",
            description: "text-text-secondary text-caption",
            actionButton: "bg-primary-600 hover:bg-primary-700 text-text-inverse rounded-button",
            cancelButton: "bg-surface-sunken hover:bg-surface-muted text-text-primary rounded-button",
            error: "border-danger-200",
            success: "border-success-200",
            warning: "border-warning-200",
            info: "border-info-200"
          }
        }}
      />
    </>
  );
}

/**
 * Imperative toast API. Use anywhere outside the component tree (or inside,
 * if a hook isn't ergonomic).
 *
 * ```ts
 * toast.success('Strategy cloned');
 * toast.error('Failed to delete strategy', { description: err.message });
 * ```
 */
export const toast = {
  success: (message: string, opts?: { description?: string }) => sonnerToast.success(message, opts),
  error: (message: string, opts?: { description?: string }) => sonnerToast.error(message, opts),
  warning: (message: string, opts?: { description?: string }) => sonnerToast.warning(message, opts),
  info: (message: string, opts?: { description?: string }) => sonnerToast.info(message, opts),
  message: (message: string, opts?: { description?: string }) => sonnerToast.message(message, opts),
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- keeps the exported type nameable (avoids TS4023 on declaration emit)
  promise: sonnerToast.promise.bind(sonnerToast) as typeof sonnerToast.promise
};

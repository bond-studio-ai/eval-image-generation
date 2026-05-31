"use client";

import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import { cn } from "./cn";

/**
 * Selector for elements considered focusable by the focus trap. Mirrors the
 * common "tabbable" set; the trap further filters by visibility and the
 * `disabled` attribute.
 */
const FOCUSABLE_SELECTOR = ["a[href]", "button", "input", "select", "textarea", '[tabindex]:not([tabindex="-1"])'].join(",");

function getFocusable(root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return all.filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.tabIndex < 0) return false;
    // Skip elements rendered with display:none or visibility:hidden.
    return el.offsetParent !== null || el === document.activeElement;
  });
}

/**
 * Mount order of open modals. Only the topmost (last) entry reacts to Escape
 * and traps Tab, so nested modals dismiss one layer at a time instead of every
 * mounted instance closing on a single keypress.
 */
const modalStack: symbol[] = [];

export interface ModalProps {
  /** Called when the user dismisses via backdrop click or Escape. */
  onClose: () => void;
  children: ReactNode;
  /** id of the element naming the dialog (e.g. its heading). */
  labelledById?: string;
  /** Accessible name when there is no visible heading to point at. */
  ariaLabel?: string;
  /** Classes for the content panel — use this to size the dialog. */
  className?: string;
  /** Classes for the centering wrapper (e.g. custom padding). */
  containerClassName?: string;
  /** Classes for the backdrop (e.g. a darker tint for lightboxes). */
  backdropClassName?: string;
  /** Element to focus when the modal opens; defaults to the first focusable. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Centered modal dialog: dimmed backdrop, click-outside and Escape to dismiss,
 * a focus trap that keeps Tab inside the panel, and focus restoration to the
 * trigger on close. This is the single home for overlay behavior — reach for it
 * instead of hand-rolling a `role="button"` backdrop or a bare `<dialog open>`.
 *
 * Rendered with `position: fixed` (no portal needed) so it escapes ancestor
 * `overflow`. Provide either `labelledById` or `ariaLabel` for an accessible
 * name.
 */
export function Modal({ onClose, children, labelledById, ariaLabel, className, containerClassName, backdropClassName, initialFocusRef }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Keep the latest onClose in a ref so the focus-trap effect can run once on
  // mount without re-subscribing (and thrashing focus) when callers pass an
  // inline arrow for onClose.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const root = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const token = Symbol("modal");
    modalStack.push(token);
    const isTopmost = () => modalStack.at(-1) === token;

    const onKey = (e: KeyboardEvent) => {
      // Nested modals all listen on window; only the top layer handles keys.
      if (!isTopmost()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !root) return;

      const focusables = getFocusable(root);
      if (focusables.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const [first] = focusables;
      const last = focusables.at(-1);
      const active = document.activeElement as HTMLElement | null;
      const insideDialog = Boolean(active) && root.contains(active);

      if (e.shiftKey) {
        if (!insideDialog || active === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (!insideDialog || active === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", onKey);

    // Move focus into the dialog so the trap and Escape work immediately.
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (root) {
      (getFocusable(root)[0] ?? root).focus();
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      const idx = modalStack.indexOf(token);
      if (idx !== -1) modalStack.splice(idx, 1);
      const active = document.activeElement;
      const focusEscaped = active && active !== document.body && !root?.contains(active);
      if (!focusEscaped && previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
    // Mount/unmount only: onClose is read through a ref, and initialFocusRef is
    // a stable ref object captured at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", containerClassName)}>
      <div className={cn("bg-overlay/40 absolute inset-0", backdropClassName)} aria-hidden="true" onClick={onClose} />
      <dialog ref={dialogRef} open aria-modal="true" aria-label={ariaLabel} aria-labelledby={labelledById} tabIndex={-1} className={cn("rounded-card bg-surface shadow-modal relative m-0 w-full max-w-md", className)}>
        {children}
      </dialog>
    </div>
  );
}

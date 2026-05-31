"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { ReactNode, RefObject } from "react";
import { cn } from "./cn";

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
 * Centered modal dialog built on Radix Dialog: dimmed backdrop, click-outside
 * and Escape to dismiss, a focus trap, focus restoration to the trigger on
 * close, and correct nested-dialog stacking (each instance manages its own
 * dismissable layer). This is the single home for overlay behavior — reach for
 * it instead of hand-rolling a backdrop or a bare `<dialog open>`.
 *
 * Provide either `labelledById` or `ariaLabel` for an accessible name; a
 * visually-hidden title is always rendered so Radix's a11y contract is met even
 * when the visible heading lives in `children`.
 */
export function Modal({ onClose, children, labelledById, ariaLabel, className, containerClassName, backdropClassName, initialFocusRef }: ModalProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cn("bg-overlay/40 fixed inset-0 z-50", backdropClassName)} />
        {/* The centering layer is click-through (pointer-events-none) so a click
            in the empty area reaches the overlay and dismisses via Radix. */}
        <div className={cn("pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4", containerClassName)}>
          <Dialog.Content
            aria-label={ariaLabel}
            aria-labelledby={labelledById}
            aria-describedby={undefined}
            onOpenAutoFocus={
              initialFocusRef
                ? (event) => {
                    if (initialFocusRef.current) {
                      event.preventDefault();
                      initialFocusRef.current.focus();
                    }
                  }
                : undefined
            }
            className={cn("rounded-card bg-surface shadow-modal pointer-events-auto relative m-0 w-full max-w-md", className)}
          >
            <VisuallyHidden asChild>
              <Dialog.Title>{ariaLabel ?? ""}</Dialog.Title>
            </VisuallyHidden>
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipAlign = 'center' | 'start' | 'end';

interface TooltipOptions {
  /** Max width of the tooltip popover, in pixels. */
  width?: number;
  /** Horizontal anchor relative to the trigger. */
  align?: TooltipAlign;
}

/**
 * Hook that returns a callback `ref`, event handlers, and a `portal`
 * React node for a hover/focus tooltip mounted into `document.body`.
 *
 * Visibility is JS-driven (no CSS `:hover` + `invisible` class), so
 * it side-steps the two failure modes the previous tooltip had:
 *
 * 1. `overflow-x-auto` ancestors compute `overflow-y` to `auto` per
 *    the CSS spec, clipping any tooltip extending below its row.
 * 2. Stacking contexts inside the modal could outrank `z-50`.
 *
 * Portal + `position: fixed` + `zIndex: 9999` makes the popover
 * provably visible only while the trigger is currently hovered or
 * keyboard-focused.
 *
 * `ref` is intentionally a callback ref (a stable function) rather
 * than a `RefObject` — React Compiler's `react-hooks/refs` lint
 * rule flags `.current` access through a hook return value, and a
 * callback ref keeps the imperative DOM handle entirely inside the
 * hook so callers never see a `.current` they could misuse.
 */
export function useTooltip(hint: ReactNode, options: TooltipOptions = {}) {
  const { width = 240, align = 'center' } = options;
  const elementRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Stable callback ref. React calls this with the DOM node on mount
  // and with `null` on unmount; we just stash it for the event
  // handlers below to read.
  const ref = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  const onMouseEnter = useCallback(() => {
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Anchor the popover relative to the trigger's bounding box.
    // Right-aligned headers point the bubble at their right edge so
    // it doesn't overflow past the table; left-aligned text points
    // at the start; everything else centers.
    const left =
      align === 'start' ? rect.left : align === 'end' ? rect.right : rect.left + rect.width / 2;
    setPos({ left, top: rect.bottom + 6 });
  }, [align]);

  const onMouseLeave = useCallback(() => {
    setPos(null);
  }, []);

  // Focus / blur share the same hover behavior so keyboard users get
  // the same tooltip without a separate code path.
  const onFocus = onMouseEnter;
  const onBlur = onMouseLeave;

  // `typeof document !== 'undefined'` is a hydration-safe guard:
  // `pos` is `null` on first render in every environment (no hover
  // has happened yet), so server and client output match. The
  // tooltip only appears after a client-side event sets `pos`.
  const portal =
    pos && typeof document !== 'undefined'
      ? createPortal(
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              maxWidth: width,
              transform:
                align === 'start'
                  ? 'translateX(0)'
                  : align === 'end'
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
              zIndex: 9999,
            }}
            className="pointer-events-none rounded bg-gray-900 px-2 py-1.5 text-[11px] leading-snug font-normal tracking-normal whitespace-normal text-white normal-case shadow-lg"
          >
            {hint}
          </span>,
          document.body,
        )
      : null;

  return { ref, onMouseEnter, onMouseLeave, onFocus, onBlur, portal };
}

/**
 * Default `<span>`-wrapped tooltip for inline labels. Renders a
 * focusable trigger so screen readers and keyboard users can still
 * reach the hint. Click-targets that already have their own
 * interactive element (e.g. sort buttons) should use `useTooltip`
 * directly to avoid nested `tabIndex` elements.
 */
export function Tooltip({
  children,
  hint,
  width,
  triggerClassName,
  align,
}: {
  children: ReactNode;
  hint: ReactNode;
  width?: number;
  triggerClassName?: string;
  align?: TooltipAlign;
}) {
  const { ref, onMouseEnter, onMouseLeave, onFocus, onBlur, portal } = useTooltip(hint, {
    ...(width !== undefined && { width }),
    ...(align !== undefined && { align }),
  });
  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`inline-flex cursor-help outline-none ${triggerClassName ?? ''}`}
      >
        {children}
      </span>
      {portal}
    </>
  );
}

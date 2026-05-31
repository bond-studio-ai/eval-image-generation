"use client";

import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from "react";
import { GripVerticalIcon } from "@/components/ui/icons";

interface TwoPaneSplitProps {
  left: ReactNode;
  right: ReactNode;
  /** Initial ratio (0..1) of width given to the left pane. Default 0.5. */
  defaultRatio?: number;
  /** Minimum pane width in pixels when side-by-side. Default 240. */
  minPaneWidth?: number;
  /** Fixed height in pixels for both panes. Default 520. */
  height?: number;
  /** Additional classes for the outer container. */
  className?: string;
}

/**
 * Side-by-side split pane with a draggable central divider.
 *
 * Dragging the divider grows one pane and shrinks the other so the
 * combined width stays constant. Both panes are given the same fixed
 * `height` so the card inside (with `h-full flex flex-col`) fills the
 * pane and the editor's `fillHeight` flex-fills inside the card.
 *
 * Below the `sm` breakpoint the layout collapses to a stacked column
 * with no divider; the fixed height still applies to each stacked card.
 *
 * Implementation note: panes distribute remaining width (container
 * width minus the divider) via `flex-grow`, not `flex-basis: calc(%)`,
 * so at ratio 0.5 the two widths are pixel-identical regardless of
 * rounding.
 */
export function TwoPaneSplit({ left, right, defaultRatio = 0.5, minPaneWidth = 240, height = 520, className = "" }: TwoPaneSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hDividerRef = useRef<HTMLDivElement>(null);
  const hDragging = useRef(false);

  const [ratio, setRatio] = useState(() => Math.min(0.85, Math.max(0.15, defaultRatio)));

  const onHPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    hDragging.current = true;
    hDividerRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onHPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!hDragging.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = e.clientX - rect.left;
      const minRatio = Math.min(0.4, minPaneWidth / rect.width);
      const maxRatio = 1 - minRatio;
      const next = Math.min(maxRatio, Math.max(minRatio, x / rect.width));
      setRatio(next);
    },
    [minPaneWidth]
  );

  const endHDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    hDragging.current = false;
    if (hDividerRef.current?.hasPointerCapture(e.pointerId)) {
      hDividerRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const resetRatio = useCallback(() => {
    setRatio(0.5);
  }, []);

  const onHKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const STEP = 0.02;
      const clamp = (value: number) => {
        const width = containerRef.current?.getBoundingClientRect().width ?? 0;
        const minRatio = width > 0 ? Math.min(0.4, minPaneWidth / width) : 0.15;
        return Math.min(1 - minRatio, Math.max(minRatio, value));
      };
      switch (e.key) {
        case "ArrowLeft": {
          e.preventDefault();
          setRatio((prev) => clamp(prev - STEP));

          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          setRatio((prev) => clamp(prev + STEP));

          break;
        }
        case "Home": {
          e.preventDefault();
          setRatio(0.5);

          break;
        }
        // No default
      }
    },
    [minPaneWidth]
  );

  const containerStyle = {
    "--tpane-left-grow": ratio.toFixed(6),
    "--tpane-right-grow": (1 - ratio).toFixed(6)
  } as CSSProperties;

  const paneStyle: CSSProperties = { height: `${height}px` };

  return (
    <div ref={containerRef} style={containerStyle} className={`flex min-h-0 flex-col gap-6 sm:flex-row sm:gap-0 ${className}`}>
      <div className="flex min-w-0 flex-col sm:flex-[var(--tpane-left-grow)_1_0%]" style={paneStyle}>
        {left}
      </div>
      <div className="group relative hidden w-6 shrink-0 sm:block">
        <div
          ref={hDividerRef}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize prompt panels horizontally"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          title="Drag to resize — double-click to reset"
          onPointerDown={onHPointerDown}
          onPointerMove={onHPointerMove}
          onPointerUp={endHDrag}
          onPointerCancel={endHDrag}
          onKeyDown={onHKeyDown}
          onDoubleClick={resetRatio}
          className="absolute inset-0 h-full w-full cursor-col-resize touch-none select-none"
        />
        <div className="group-hover:border-primary-400 group-active:border-primary-500 border-border-strong bg-surface pointer-events-none absolute top-1/2 left-1/2 flex h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border shadow-xs transition-colors">
          <GripVerticalIcon className="group-hover:text-primary-500 text-text-muted size-2.5" aria-hidden="true" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col sm:flex-[var(--tpane-right-grow)_1_0%]" style={paneStyle}>
        {right}
      </div>
    </div>
  );
}

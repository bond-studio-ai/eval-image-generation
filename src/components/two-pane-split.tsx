'use client';

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

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
export function TwoPaneSplit({
  left,
  right,
  defaultRatio = 0.5,
  minPaneWidth = 240,
  height = 520,
  className = '',
}: TwoPaneSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hDividerRef = useRef<HTMLDivElement>(null);
  const hDragging = useRef(false);

  const [ratio, setRatio] = useState(() =>
    Math.min(0.85, Math.max(0.15, defaultRatio)),
  );

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
    [minPaneWidth],
  );

  const endHDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    hDragging.current = false;
    if (hDividerRef.current?.hasPointerCapture(e.pointerId)) {
      hDividerRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const resetRatio = useCallback(() => setRatio(0.5), []);

  const containerStyle = {
    '--tpane-left-grow': ratio.toFixed(6),
    '--tpane-right-grow': (1 - ratio).toFixed(6),
  } as CSSProperties;

  const paneStyle: CSSProperties = { height: `${height}px` };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`flex min-h-0 flex-col gap-6 sm:flex-row sm:gap-0 ${className}`}
    >
      <div
        className="flex min-w-0 flex-col sm:flex-[var(--tpane-left-grow)_1_0%]"
        style={paneStyle}
      >
        {left}
      </div>
      <div
        ref={hDividerRef}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize prompt panels horizontally"
        title="Drag to resize — double-click to reset"
        onPointerDown={onHPointerDown}
        onPointerMove={onHPointerMove}
        onPointerUp={endHDrag}
        onPointerCancel={endHDrag}
        onDoubleClick={resetRatio}
        className="group relative hidden w-6 shrink-0 cursor-col-resize touch-none select-none sm:block"
      >
        <div className="absolute left-1/2 top-1/2 flex h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border border-gray-300 bg-white shadow-xs transition-colors group-hover:border-primary-400 group-active:border-primary-500">
          <svg
            className="h-2.5 w-2.5 text-gray-500 group-hover:text-primary-500"
            viewBox="0 0 10 10"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="3.5" cy="3" r="0.6" />
            <circle cx="3.5" cy="5" r="0.6" />
            <circle cx="3.5" cy="7" r="0.6" />
            <circle cx="6.5" cy="3" r="0.6" />
            <circle cx="6.5" cy="5" r="0.6" />
            <circle cx="6.5" cy="7" r="0.6" />
          </svg>
        </div>
      </div>
      <div
        className="flex min-w-0 flex-col sm:flex-[var(--tpane-right-grow)_1_0%]"
        style={paneStyle}
      >
        {right}
      </div>
    </div>
  );
}

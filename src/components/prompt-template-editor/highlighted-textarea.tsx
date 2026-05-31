import { type ChangeEvent, Fragment, type Ref, type TextareaHTMLAttributes, type UIEvent, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { renderHighlightedHandlebarsByLine } from "@/lib/highlight-handlebars";

export type HighlightedTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  fillHeight?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

// Width of the line-number gutter, declared once so the overlay and the
// textarea's left padding stay in lockstep.
const GUTTER_WIDTH = "2.5rem";

/**
 * Measure the native vertical scrollbar width once and cache it.
 * Returns 0 in non-DOM environments and on platforms with overlay
 * scrollbars (e.g. macOS Safari with trackpad-only scrollbars).
 */
let cachedScrollbarWidth: number | null = null;
function measureScrollbarWidth(): number {
  if (cachedScrollbarWidth !== null) return cachedScrollbarWidth;
  if (typeof document === "undefined") return 0;
  const outer = document.createElement("div");
  outer.style.cssText = "position:absolute;top:-9999px;left:-9999px;visibility:hidden;overflow:scroll;width:100px;height:100px;";
  document.body.append(outer);
  const inner = document.createElement("div");
  inner.style.cssText = "width:100%;height:200px;";
  outer.append(inner);
  const sw = outer.offsetWidth - inner.offsetWidth;
  outer.remove();
  cachedScrollbarWidth = sw;
  return sw;
}

// The scrollbar width is a per-environment constant, so there is nothing to
// subscribe to and the store never changes after the first measurement.
function subscribeScrollbarWidth(): () => void {
  return () => {
    // No store to subscribe to; the measurement never changes.
  };
}

// The server has no scrollbar to measure; it renders 0 and the client measures
// the real width on hydration, so there is no post-mount state flip.
function getServerScrollbarWidth(): number {
  return 0;
}

/**
 * Transparent-text `<textarea>` with a syntax-highlighted overlay and a
 * line-number gutter, both aligned character-for-character with the
 * textarea behind them.
 *
 * Layout:
 *  - A single overlay behind the textarea hosts a 2-column CSS grid:
 *      col 1 = fixed-width gutter cell (line number, top-aligned)
 *      col 2 = flexible content cell (highlighted text, `pre-wrap`)
 *    Each logical line is its own grid row, so when a line wraps into
 *    multiple visual rows the grid row auto-expands and the gutter
 *    number stays pinned at the visual top of its logical line.
 *  - The textarea is stacked above the overlay (`z-10`). Its
 *    `paddingLeft` is forced to `GUTTER_WIDTH` so characters line up
 *    with the overlay's content column, making wrap points match.
 *  - The textarea reserves its native scrollbar width via
 *    `scrollbar-gutter: stable`. To keep the overlay's usable width
 *    identical, the overlay is NOT a scroll container — it is
 *    `overflow: hidden`, its right padding is the measured scrollbar
 *    width, and scrolling is sync'd by translating the inner grid via
 *    `transform` from the textarea's `onScroll`. This sidesteps every
 *    browser's quirky `scrollbar-gutter` handling for nested hidden
 *    scrollbars, which was the root cause of the line-wrap drift.
 *  - Color and background on the textarea are set via inline `style` so
 *    they always win over whatever the caller passes in `className`.
 */
export function HighlightedTextarea({ value, onChange, className, fillHeight = false, onScroll, style, ref, ...rest }: HighlightedTextareaProps) {
  const overlayInnerRef = useRef<HTMLDivElement>(null);
  const scrollbarWidth = useSyncExternalStore(subscribeScrollbarWidth, measureScrollbarWidth, getServerScrollbarWidth);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLTextAreaElement>) => {
      const inner = overlayInnerRef.current;
      if (inner) {
        const target = e.currentTarget;
        inner.style.transform = `translate(${-target.scrollLeft}px, ${-target.scrollTop}px)`;
      }
      onScroll?.(e);
    },
    [onScroll]
  );

  const lines = useMemo(() => renderHighlightedHandlebarsByLine(value), [value]);

  return (
    <div className={`relative ${fillHeight ? "flex min-h-0 flex-1" : ""}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
        style={{
          borderColor: "transparent",
          boxShadow: "none",
          paddingLeft: 0,
          paddingRight: scrollbarWidth
        }}
      >
        <div
          ref={overlayInnerRef}
          className="grid"
          style={{
            gridTemplateColumns: `${GUTTER_WIDTH} 1fr`
          }}
        >
          {lines.map((line, i) => (
            <Fragment key={i}>
              <div className="text-text-disabled text-body self-start pr-2 text-right font-mono leading-5 tabular-nums select-none">{i + 1}</div>
              <div className="text-text-primary text-body pr-3 font-mono leading-5 break-words whitespace-pre-wrap">{line}</div>
            </Fragment>
          ))}
        </div>
      </div>
      <textarea
        {...rest}
        ref={ref}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        spellCheck={false}
        className={`relative z-10 w-full ${className ?? ""}`}
        style={{
          ...style,
          color: "transparent",
          backgroundColor: "transparent",
          caretColor: "rgb(17, 24, 39)",
          paddingLeft: GUTTER_WIDTH,
          scrollbarGutter: "stable",
          lineHeight: "1.25rem"
        }}
      />
    </div>
  );
}

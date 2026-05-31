"use client";

import { useCallback, useEffect, useRef } from "react";
import { CdnImage } from "@/components/cdn-image";

/** Before/after slider: left image is revealed by position %; drag the bar to compare. */
export function ComparisonSlider({
  leftImageUrl,
  rightImageUrl,
  position,
  onPositionChange,
  leftImageAlt = "Before",
  rightImageAlt = "After",
  leftLabel,
  rightLabel
}: {
  leftImageUrl: string;
  rightImageUrl: string;
  position: number;
  onPositionChange: (p: number) => void;
  leftImageAlt?: string;
  rightImageAlt?: string;
  /** Optional label shown on the left side (e.g. "Scene reference"). */
  leftLabel?: string;
  /** Optional label shown on the right side (e.g. "Output"). */
  rightLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onPositionChange(pct);
    },
    [onPositionChange]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) handleMove(e.clientX);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [handleMove]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches.length === 1 ? e.touches[0] : undefined;
      if (isDragging.current && touch) handleMove(touch.clientX);
    };
    const onTouchEnd = () => {
      isDragging.current = false;
    };
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Before and after comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      className="relative h-full w-full overflow-hidden rounded-lg select-none"
      onMouseDown={(e) => {
        e.preventDefault();
        isDragging.current = true;
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        const touch = e.touches.length === 1 ? e.touches[0] : undefined;
        if (touch) {
          isDragging.current = true;
          handleMove(touch.clientX);
        }
      }}
      onMouseUp={() => {
        isDragging.current = false;
      }}
      onMouseLeave={() => {
        isDragging.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onPositionChange(Math.max(0, position - 5));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onPositionChange(Math.min(100, position + 5));
        }
      }}
    >
      {/* Bottom: right image (always visible as base) */}
      <div className="absolute inset-0">
        <CdnImage src={rightImageUrl} alt={rightImageAlt} fill sizes="100vw" className="object-contain" draggable={false} />
      </div>
      {/* Top: left image (clipped by position %) */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <CdnImage src={leftImageUrl} alt={leftImageAlt} fill sizes="100vw" className="object-contain" draggable={false} />
      </div>
      {/* Side labels: left moves with scene, right stays on output side */}
      {leftLabel != null && leftLabel !== "" && (
        <div className="pointer-events-none absolute inset-0 z-20" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <span className="text-text-inverse bg-overlay/70 text-caption absolute top-2 left-2 rounded-md px-2 py-1 font-medium">{leftLabel}</span>
        </div>
      )}
      {rightLabel != null && rightLabel !== "" && <div className="text-text-inverse bg-overlay/70 text-caption pointer-events-none absolute top-2 right-2 z-20 rounded-md px-2 py-1 font-medium">{rightLabel}</div>}
      {/* Draggable bar */}
      <div className="bg-surface absolute top-0 bottom-0 z-10 w-1 cursor-ew-resize shadow-lg" style={{ left: `${position}%`, transform: "translateX(-50%)" }}>
        <div className="border-border-strong bg-surface-sunken absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-0.5 rounded-full border px-1.5 py-1">
          <div className="bg-text-disabled h-3 w-0.5 rounded-full" />
          <div className="bg-text-disabled h-3 w-0.5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Before/after slider: left image is revealed by position %; drag the bar to compare. */
export function ComparisonSlider({
  leftImageUrl,
  rightImageUrl,
  position,
  onPositionChange,
  leftImageAlt = 'Before',
  rightImageAlt = 'After',
  leftLabel,
  rightLabel,
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
    [onPositionChange],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) handleMove(e.clientX);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleMove]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches.length === 1) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      isDragging.current = false;
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden rounded-lg"
      onMouseDown={(e) => {
        e.preventDefault();
        isDragging.current = true;
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          isDragging.current = true;
          handleMove(e.touches[0].clientX);
        }
      }}
      onMouseUp={() => {
        isDragging.current = false;
      }}
      onMouseLeave={() => {
        isDragging.current = false;
      }}
    >
      {/* Bottom: right image (always visible as base) */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rightImageUrl}
          alt={rightImageAlt}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
      {/* Top: left image (clipped by position %) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={leftImageUrl}
          alt={leftImageAlt}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
      {/* Side labels: left moves with scene, right stays on output side */}
      {leftLabel != null && leftLabel !== '' && (
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
            {leftLabel}
          </span>
        </div>
      )}
      {rightLabel != null && rightLabel !== '' && (
        <div className="absolute right-2 top-2 z-20 pointer-events-none rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
          {rightLabel}
        </div>
      )}
      {/* Draggable bar */}
      <div
        className="absolute top-0 bottom-0 z-10 w-1 cursor-ew-resize bg-white shadow-lg"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-0.5 rounded-full border border-gray-300 bg-gray-100 px-1.5 py-1">
          <div className="h-3 w-0.5 rounded-full bg-gray-400" />
          <div className="h-3 w-0.5 rounded-full bg-gray-400" />
        </div>
      </div>
    </div>
  );
}

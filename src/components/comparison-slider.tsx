"use client";

import { useMemo } from "react";
import { ReactCompareSlider } from "react-compare-slider";
import { CdnImage } from "@/components/cdn-image";

// Static drag handle — hoisted so it isn't re-created on every drag frame.
const SLIDER_HANDLE = (
  <div className="bg-surface relative h-full w-1 cursor-ew-resize shadow-lg">
    <div className="border-border-strong bg-surface-sunken absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-0.5 rounded-full border px-1.5 py-1">
      <div className="bg-text-disabled h-3 w-0.5 rounded-full" />
      <div className="bg-text-disabled h-3 w-0.5 rounded-full" />
    </div>
  </div>
);

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
  const itemOne = useMemo(
    () => (
      <div className="relative h-full w-full">
        <CdnImage src={leftImageUrl} alt={leftImageAlt} fill sizes="100vw" className="object-contain" draggable={false} />
        {leftLabel != null && leftLabel !== "" && <span className="text-text-inverse bg-overlay/70 text-caption absolute top-2 left-2 rounded-md px-2 py-1 font-medium">{leftLabel}</span>}
      </div>
    ),
    [leftImageUrl, leftImageAlt, leftLabel]
  );

  const itemTwo = useMemo(
    () => (
      <div className="relative h-full w-full">
        <CdnImage src={rightImageUrl} alt={rightImageAlt} fill sizes="100vw" className="object-contain" draggable={false} />
      </div>
    ),
    [rightImageUrl, rightImageAlt]
  );

  return (
    <div className="relative h-full w-full">
      <ReactCompareSlider
        defaultPosition={position}
        onPositionChange={onPositionChange}
        className="h-full w-full overflow-hidden rounded-lg select-none"
        // Drag anywhere on the slider, matching the previous behavior.
        onlyHandleDraggable={false}
        handle={SLIDER_HANDLE}
        itemOne={itemOne}
        itemTwo={itemTwo}
      />
      {rightLabel != null && rightLabel !== "" && <div className="text-text-inverse bg-overlay/70 text-caption pointer-events-none absolute top-2 right-2 z-20 rounded-md px-2 py-1 font-medium">{rightLabel}</div>}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ComparisonSlider } from '@/components/comparison-slider';
import { SkeletonImage } from './mask-preview';

/**
 * "Combined overlay" section of the segmentation modal. When the
 * backend supplies a `productMaskUrl` alongside the overlay, this
 * renders the shared `ComparisonSlider` so the reviewer can wipe
 * between the SAM segmentation overlay and the dollhouse ground-truth
 * product mask — same draggable bar as the dollhouse-vs-output
 * comparison in the grid lightbox.
 *
 * Default slider position is `0`: the right image (overlay) is shown
 * at 100% and the left image (mask) is fully clipped out of view.
 * Per the user spec — drift QA defaults to "show me the result" and
 * the reviewer drags rightward to reveal the ground truth underneath.
 *
 * Falls back to the legacy static `<a>` overlay link when no mask is
 * available (older runs that pre-date the field, or generations where
 * drift didn't run).
 */
export function OverlayComparison({
  overlayUrl,
  productMaskUrl,
}: {
  overlayUrl: string;
  productMaskUrl?: string | null;
}) {
  // Local position state — same controlled pattern as the lightbox.
  // Starts at 0 so the reviewer sees 100% of the segmentation overlay
  // before they touch the slider.
  const [position, setPosition] = useState(0);

  const hasComparison = !!productMaskUrl;

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
          {hasComparison ? 'Overlay vs dollhouse mask' : 'Combined overlay'}
        </h4>
        <a
          href={overlayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-purple-700 hover:text-purple-900 hover:underline"
        >
          Open full image
        </a>
      </div>
      {hasComparison ? (
        <>
          <div className="relative aspect-[4/3] max-h-[480px] w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            <ComparisonSlider
              leftImageUrl={productMaskUrl}
              rightImageUrl={overlayUrl}
              position={position}
              onPositionChange={setPosition}
              leftImageAlt="Dollhouse product mask (ground truth)"
              rightImageAlt="Combined segmentation overlay"
              leftLabel="Dollhouse mask"
              rightLabel="Segmentation overlay"
            />
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-500">
            Drag the bar to reveal the dollhouse product mask underneath. Defaults to 100% overlay.
          </p>
        </>
      ) : (
        <a
          href={overlayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50"
        >
          <SkeletonImage
            src={overlayUrl}
            alt="Combined segmentation overlay (all categories tinted)"
            containerClassName="aspect-[4/3] max-h-[480px] w-full"
            imgClassName="block h-full w-full object-contain"
          />
        </a>
      )}
    </div>
  );
}

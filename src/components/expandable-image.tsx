'use client';

import { useState } from 'react';
import { ImageWithSkeleton } from '@/components/image-with-skeleton';

interface ExpandableImageProps {
  src: string;
  alt: string;
  /** Class for the image container (e.g. "relative h-80 bg-gray-50"). */
  wrapperClassName?: string;
  /** Extra class on the <img> itself. */
  className?: string;
}

/**
 * Renders an image with skeleton that expands into a full-screen lightbox when clicked.
 */
export function ExpandableImage({
  src,
  alt,
  wrapperClassName,
  className,
}: ExpandableImageProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`cursor-pointer ${wrapperClassName ?? ''}`}
        aria-label={`Expand ${alt}`}
      >
        <ImageWithSkeleton
          src={src}
          alt={alt}
          loading="lazy"
          className={className}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="truncate text-sm font-medium text-gray-700">{alt}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 overflow-auto p-4">
              <div className="relative w-full overflow-hidden rounded-lg bg-gray-100">
                {!loaded && (
                  <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  onLoad={() => setLoaded(true)}
                  className={`w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'absolute inset-0 opacity-0'}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

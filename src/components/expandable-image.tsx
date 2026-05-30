"use client";

import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

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
export function ExpandableImage({ src, alt, wrapperClassName, className }: ExpandableImageProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`cursor-pointer ${wrapperClassName ?? ""}`} aria-label={`Expand ${alt}`}>
        <ImageWithSkeleton src={src} alt={alt} className={className} />
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          ariaLabel="Expanded image"
          backdropClassName="bg-black/70"
          containerClassName="sm:p-6"
          className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="truncate text-sm font-medium text-gray-700">{alt}</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200">
              <XIcon className="size-5" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 overflow-auto p-4">
            <div className="relative w-full overflow-hidden rounded-lg bg-gray-100">
              {!loaded && <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />}
              <CdnImage
                src={src}
                alt={alt}
                width={0}
                height={0}
                sizes="100vw"
                onLoad={() => setLoaded(true)}
                className={`h-auto w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "absolute inset-0 opacity-0"}`}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

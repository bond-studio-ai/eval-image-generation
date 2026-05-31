"use client";

import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";

type ImageWithSkeletonProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string;
  alt?: string;
  /** Optional wrapper className for the container (relative + size). Omit to render fragment (skeleton + img only; parent must be relative with size). */
  wrapperClassName?: string;
  /** `sizes` hint for the responsive srcset. Default suits half/third-width layouts; pass a tighter value (e.g. "56px") for small thumbnails so the CDN isn't asked for an oversized image. */
  sizes?: string;
};

/**
 * Renders an image with a pulse skeleton until loaded.
 * Pass wrapperClassName when the image should be in its own sized container (e.g. "h-56 w-full rounded-lg").
 * Omit wrapperClassName when the parent already has relative and size (skeleton + img will fill parent).
 */
export function ImageWithSkeleton({ src, alt, className = "", wrapperClassName, sizes = "(max-width:768px) 50vw, 33vw" }: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  const content = (
    <>
      {!loaded && <div className="bg-border absolute inset-0 animate-pulse rounded-[inherit]" aria-hidden />}
      <CdnImage
        src={src}
        alt={alt ?? ""}
        fill
        sizes={sizes}
        onLoad={() => {
          setLoaded(true);
        }}
        className={`object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      />
    </>
  );

  if (wrapperClassName) {
    return <div className={`relative overflow-hidden ${wrapperClassName}`}>{content}</div>;
  }

  return <>{content}</>;
}

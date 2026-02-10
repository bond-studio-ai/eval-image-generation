'use client';

import { useState } from 'react';

type ImageWithSkeletonProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** Optional wrapper className for the container (relative + size). Omit to render fragment (skeleton + img only; parent must be relative with size). */
  wrapperClassName?: string;
};

/**
 * Renders an image with a pulse skeleton until loaded.
 * Pass wrapperClassName when the image should be in its own sized container (e.g. "h-56 w-full rounded-lg").
 * Omit wrapperClassName when the parent already has relative and size (skeleton + img will fill parent).
 */
export function ImageWithSkeleton({
  src,
  alt,
  className = '',
  wrapperClassName,
  ...props
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  const fillClass = wrapperClassName ? 'h-full w-full' : 'absolute inset-0 h-full w-full';
  const content = (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse rounded-[inherit] bg-gray-200"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`${fillClass} object-contain transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        {...props}
      />
    </>
  );

  if (wrapperClassName) {
    return (
      <div className={`relative overflow-hidden ${wrapperClassName}`}>{content}</div>
    );
  }

  return <>{content}</>;
}

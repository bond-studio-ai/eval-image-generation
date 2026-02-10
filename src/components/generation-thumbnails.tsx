'use client';

import { withImageParams } from '@/lib/image-utils';
import { useState } from 'react';

interface GenerationThumbnailsProps {
  urls: string[];
}

function ThumbnailImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-gray-200">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={withImageParams(url, 96)}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

function LightboxImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-100">
      {/* Skeleton placeholder — maintains a 4:3 aspect ratio until image loads */}
      {!loaded && (
        <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'absolute inset-0 opacity-0'}`}
      />
    </div>
  );
}

export function GenerationThumbnails({ urls }: GenerationThumbnailsProps) {
  const [expanded, setExpanded] = useState(false);

  if (urls.length === 0) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded border border-gray-200 bg-gray-50">
        <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail(s) with loading skeleton */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(true);
        }}
        className="flex cursor-pointer items-center gap-1.5"
      >
        {urls.slice(0, 2).map((url, i) => (
          <ThumbnailImage key={i} url={url} alt={`Result ${i + 1}`} />
        ))}
        {urls.length > 2 && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
            +{urls.length - 2}
          </span>
        )}
      </button>

      {/* Lightbox — full-width modal with skeleton loading */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">
                {urls.length} result{urls.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image grid */}
            <div className="flex-1 overflow-auto p-4">
              <div className={`grid gap-4 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {urls.map((url, i) => (
                  <LightboxImage key={i} url={url} alt={`Result ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

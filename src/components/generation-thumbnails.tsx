'use client';

import { useState } from 'react';

interface GenerationThumbnailsProps {
  urls: string[];
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
      {/* Thumbnail(s) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(true);
        }}
        className="flex items-center gap-1.5"
      >
        {urls.slice(0, 2).map((url, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={url}
            alt={`Result ${i + 1}`}
            className="h-12 w-12 shrink-0 rounded border border-gray-200 object-cover transition-shadow hover:shadow-md"
          />
        ))}
        {urls.length > 2 && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
            +{urls.length - 2}
          </span>
        )}
      </button>

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute top-3 right-3 z-10 rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className={`grid gap-3 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {urls.map((url, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={url}
                  alt={`Result ${i + 1}`}
                  className="w-full rounded-lg object-contain"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

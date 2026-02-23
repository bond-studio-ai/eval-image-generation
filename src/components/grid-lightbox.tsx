'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface GridLightboxProps {
  src: string;
  runHref: string;
  onClose: () => void;
}

export function GridLightbox({ src, runHref, onClose }: GridLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[95vh] max-w-[95vw] cursor-default flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5">
          <Link
            href={runHref}
            className="text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            View run details &rarr;
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[85vh] w-auto rounded-lg object-contain"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

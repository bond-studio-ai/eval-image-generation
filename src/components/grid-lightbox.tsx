'use client';

import { RatingForm } from '@/app/generations/[id]/rating-form';
import { ImageEvaluationForm } from '@/components/image-evaluation-form';
import { getActiveProductCategories } from '@/lib/generation-utils';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface GridLightboxProps {
  src: string;
  runHref: string;
  /** When set, the generation result can be rated and evaluated (scene/product issues) in the modal. */
  generationId?: string | null;
  onRated?: () => void;
  onClose: () => void;
}

interface GenerationData {
  scene_accuracy_rating: string | null;
  product_accuracy_rating: string | null;
  results: { id: string; url: string }[];
  input: Record<string, unknown> | null;
}

export function GridLightbox({
  src,
  runHref,
  generationId,
  onRated,
  onClose,
}: GridLightboxProps) {
  const [generation, setGeneration] = useState<GenerationData | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const fetchGeneration = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/v1/generations/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data ?? json;
      const results = Array.isArray(data.results) ? data.results : [];
      setGeneration({
        scene_accuracy_rating: data.scene_accuracy_rating ?? null,
        product_accuracy_rating: data.product_accuracy_rating ?? null,
        results: results.map((r: { id: string; url?: string }) => ({ id: r.id, url: r.url ?? '' })),
        input: data.input ?? null,
      });
      const idx = results.findIndex((r: { url?: string }) => r.url === src);
      setImageIndex(idx >= 0 ? idx : 0);
    } catch {
      setGeneration(null);
      setImageIndex(0);
    }
  }, [src]);

  useEffect(() => {
    if (generationId) fetchGeneration(generationId);
    else {
      setGeneration(null);
      setImageIndex(0);
    }
  }, [generationId, fetchGeneration]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const results = generation?.results ?? [];
      if (results.length <= 1) return;
      if (e.key === 'ArrowLeft') setImageIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setImageIndex((i) => (i >= results.length - 1 ? 0 : i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, generation?.results]);

  const handleRated = useCallback(() => {
    if (generationId) fetchGeneration(generationId);
    onRated?.();
  }, [generationId, fetchGeneration, onRated]);

  const displayUrl = useMemo(() => {
    const results = generation?.results ?? [];
    if (results.length > 0 && results[imageIndex]) return results[imageIndex].url;
    return src;
  }, [generation?.results, imageIndex, src]);

  const resultId = useMemo(() => {
    if (!generation?.results?.length) return null;
    const r = generation.results[imageIndex] ?? generation.results[0];
    return r?.id ?? null;
  }, [generation?.results, imageIndex]);

  const productCategories = useMemo(
    () => getActiveProductCategories(generation?.input ?? null),
    [generation?.input],
  );

  const results = generation?.results ?? [];
  const hasMultiple = results.length > 1;

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
          <div className="flex items-center gap-3">
            <Link
              href={runHref}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              View run details &rarr;
            </Link>
            {hasMultiple && (
              <span className="text-sm text-gray-500">
                Image {imageIndex + 1} of {results.length}
              </span>
            )}
          </div>
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

        <div className="flex flex-1 flex-col overflow-auto p-4">
          <div className="relative flex flex-col items-center">
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImageIndex((i) => (i <= 0 ? results.length - 1 : i - 1)); }}
                  className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImageIndex((i) => (i >= results.length - 1 ? 0 : i + 1)); }}
                  className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt=""
              className="max-h-[50vh] w-auto rounded-lg object-contain"
            />
            {hasMultiple && (
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {results.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImageIndex(i); }}
                    className={`shrink-0 rounded border-2 overflow-hidden ${i === imageIndex ? 'border-primary-500' : 'border-transparent hover:border-gray-300'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt="" className="h-14 w-14 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {generationId && (
            <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Rate generation</p>
                {generation ? (
                  <RatingForm
                    generationId={generationId}
                    currentSceneAccuracyRating={generation.scene_accuracy_rating}
                    currentProductAccuracyRating={generation.product_accuracy_rating}
                    onRated={handleRated}
                  />
                ) : (
                  <p className="text-sm text-gray-500">Loading…</p>
                )}
              </div>
              {resultId && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">Scene & product issues</p>
                  <ImageEvaluationForm resultId={resultId} productCategories={productCategories} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

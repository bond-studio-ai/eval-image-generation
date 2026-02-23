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
    } catch {
      setGeneration(null);
    }
  }, []);

  useEffect(() => {
    if (generationId) fetchGeneration(generationId);
    else setGeneration(null);
  }, [generationId, fetchGeneration]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleRated = useCallback(() => {
    if (generationId) fetchGeneration(generationId);
    onRated?.();
  }, [generationId, fetchGeneration, onRated]);

  const resultId = useMemo(() => {
    if (!generation?.results?.length) return null;
    const match = generation.results.find((r) => r.url === src);
    return match?.id ?? generation.results[0]?.id ?? null;
  }, [generation?.results, src]);

  const productCategories = useMemo(
    () => getActiveProductCategories(generation?.input ?? null),
    [generation?.input],
  );

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

        <div className="flex flex-1 flex-col overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[50vh] w-auto rounded-lg object-contain"
          />
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

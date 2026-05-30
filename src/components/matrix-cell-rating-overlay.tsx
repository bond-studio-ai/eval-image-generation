'use client';

import { serviceUrl } from '@/lib/api-base';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

type Rating = 'GOOD' | 'FAILED' | null;

interface GenerationRating {
  scene: Rating;
  product: Rating;
}

interface MatrixCellRatingOverlayProps {
  generationId: string;
  onRated?: () => void;
  className?: string;
}

const thumbUp = (
  <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6ZM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4Z" />
  </svg>
);
const thumbDown = (
  <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6ZM14 9.667V4.236a2 2 0 0 0-1.106-1.789l-.05-.025A4 4 0 0 0 11.057 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.867a4 4 0 0 0 .8-2.4Z" />
  </svg>
);

export function MatrixCellRatingOverlay({
  generationId,
  onRated,
  className = '',
}: MatrixCellRatingOverlayProps) {
  const queryClient = useQueryClient();
  const ratingKey = ['generation-rating', generationId];

  const { data } = useQuery({
    queryKey: ratingKey,
    queryFn: async ({ signal }): Promise<GenerationRating> => {
      const res = await fetch(serviceUrl(`generations/${generationId}`), {
        cache: 'no-store',
        signal,
      });
      if (!res.ok) throw new Error(`Failed to load generation (${res.status})`);
      const json = await res.json();
      const d = json.data ?? json;
      return {
        scene: (d.sceneAccuracyRating ?? null) as Rating,
        product: (d.productAccuracyRating ?? null) as Rating,
      };
    },
    enabled: !!generationId,
    // Match the prior module-level cache: fetch a generation's rating once and
    // keep it; the optimistic `setQueryData` in `rate` handles in-session updates.
    staleTime: Infinity,
  });

  const sceneRating = data?.scene ?? null;
  const productRating = data?.product ?? null;

  const rate = useCallback(
    async (scene?: 'GOOD' | 'FAILED', product?: 'GOOD' | 'FAILED') => {
      const key = ['generation-rating', generationId];
      const prev = queryClient.getQueryData<GenerationRating>(key) ?? {
        scene: null,
        product: null,
      };

      // Optimistic update: write straight to the query cache.
      const nextScene = scene !== undefined ? scene : prev.scene;
      const nextProduct = product !== undefined ? product : prev.product;
      queryClient.setQueryData<GenerationRating>(key, { scene: nextScene, product: nextProduct });
      onRated?.();

      try {
        const body: Record<string, string> = {};
        if (scene !== undefined) body.sceneAccuracyRating = scene;
        if (product !== undefined) body.productAccuracyRating = product;
        const res = await fetch(serviceUrl(`generations/${generationId}/rating`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = await res.json();
          const d = json.data ?? json;
          queryClient.setQueryData<GenerationRating>(key, {
            scene: (d.sceneAccuracyRating ?? nextScene) as Rating,
            product: (d.productAccuracyRating ?? nextProduct) as Rating,
          });
        } else {
          queryClient.setQueryData<GenerationRating>(key, prev);
        }
      } catch {
        queryClient.setQueryData<GenerationRating>(key, prev);
      }
    },
    [generationId, onRated, queryClient],
  );

  const btnBase = 'rounded-md p-1.5 transition-all';

  function thumbBtnClass(current: Rating, target: 'GOOD' | 'FAILED') {
    if (current === target) {
      return target === 'GOOD'
        ? `${btnBase} bg-sky-500 text-white shadow-sm ring-1 ring-sky-400`
        : `${btnBase} bg-red-500 text-white shadow-sm ring-1 ring-red-400`;
    }
    return target === 'GOOD'
      ? `${btnBase} text-sky-300 hover:bg-sky-500/30 hover:text-sky-200`
      : `${btnBase} text-red-300 hover:bg-red-500/30 hover:text-red-200`;
  }

  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex items-end justify-center rounded-b-lg bg-gradient-to-t from-black/70 to-transparent px-2 pt-8 pb-2 opacity-0 transition-opacity group-hover:opacity-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-4 text-white">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tracking-wide uppercase drop-shadow">Scene</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => rate('GOOD')}
              className={thumbBtnClass(sceneRating, 'GOOD')}
              title="Scene good"
            >
              {thumbUp}
            </button>
            <button
              type="button"
              onClick={() => rate('FAILED')}
              className={thumbBtnClass(sceneRating, 'FAILED')}
              title="Scene failed"
            >
              {thumbDown}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tracking-wide uppercase drop-shadow">
            Product
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => rate(undefined, 'GOOD')}
              className={thumbBtnClass(productRating, 'GOOD')}
              title="Product good"
            >
              {thumbUp}
            </button>
            <button
              type="button"
              onClick={() => rate(undefined, 'FAILED')}
              className={thumbBtnClass(productRating, 'FAILED')}
              title="Product failed"
            >
              {thumbDown}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

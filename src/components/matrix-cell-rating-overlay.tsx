'use client';

import { imageGenerationApiUrl } from '@/lib/api-base';
import { useCallback, useEffect, useState } from 'react';

type Rating = 'GOOD' | 'FAILED' | null;

interface MatrixCellRatingOverlayProps {
  generationId: string;
  onRated?: () => void;
  className?: string;
}

const ratingCache = new Map<string, { scene: Rating; product: Rating }>();

export function MatrixCellRatingOverlay({
  generationId,
  onRated,
  className = '',
}: MatrixCellRatingOverlayProps) {
  const cached = ratingCache.get(generationId);
  const [sceneRating, setSceneRating] = useState<Rating>(cached?.scene ?? null);
  const [productRating, setProductRating] = useState<Rating>(cached?.product ?? null);
  const [fetched, setFetched] = useState(!!cached);

  useEffect(() => {
    if (fetched) return;
    let cancelled = false;
    fetch(imageGenerationApiUrl(`generations/${generationId}`), { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const d = json.data ?? json;
        const scene: Rating = d.sceneAccuracyRating ?? d.scene_accuracy_rating ?? null;
        const product: Rating = d.productAccuracyRating ?? d.product_accuracy_rating ?? null;
        setSceneRating(scene);
        setProductRating(product);
        ratingCache.set(generationId, { scene, product });
        setFetched(true);
      })
      .catch(() => { if (!cancelled) setFetched(true); });
    return () => { cancelled = true; };
  }, [generationId, fetched]);

  const rate = useCallback(
    async (scene?: 'GOOD' | 'FAILED', product?: 'GOOD' | 'FAILED') => {
      const prevScene = sceneRating;
      const prevProduct = productRating;

      // Optimistic update: UI and cache immediately
      const nextScene = scene !== undefined ? scene : prevScene;
      const nextProduct = product !== undefined ? product : prevProduct;
      setSceneRating(nextScene);
      setProductRating(nextProduct);
      ratingCache.set(generationId, { scene: nextScene, product: nextProduct });
      onRated?.();

      try {
        const body: Record<string, string> = {};
        if (scene !== undefined) body.scene_accuracy_rating = scene;
        if (product !== undefined) body.product_accuracy_rating = product;
        const res = await fetch(imageGenerationApiUrl(`generations/${generationId}/rating`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = await res.json();
          const d = json.data ?? json;
          const newScene: Rating = d.scene_accuracy_rating ?? nextScene;
          const newProduct: Rating = d.product_accuracy_rating ?? nextProduct;
          setSceneRating(newScene);
          setProductRating(newProduct);
          ratingCache.set(generationId, { scene: newScene, product: newProduct });
        } else {
          setSceneRating(prevScene);
          setProductRating(prevProduct);
          ratingCache.set(generationId, { scene: prevScene, product: prevProduct });
        }
      } catch {
        setSceneRating(prevScene);
        setProductRating(prevProduct);
        ratingCache.set(generationId, { scene: prevScene, product: prevProduct });
      }
    },
    [generationId, onRated, sceneRating, productRating],
  );

  const thumbUp = (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6ZM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4Z" />
    </svg>
  );
  const thumbDown = (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6ZM14 9.667V4.236a2 2 0 0 0-1.106-1.789l-.05-.025A4 4 0 0 0 11.057 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.867a4 4 0 0 0 .8-2.4Z" />
    </svg>
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
      className={`absolute inset-x-0 bottom-0 flex items-end justify-center rounded-b-lg bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-4 text-white">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide drop-shadow">Scene</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => rate('GOOD')} className={thumbBtnClass(sceneRating, 'GOOD')} title="Scene good">
              {thumbUp}
            </button>
            <button type="button" onClick={() => rate('FAILED')} className={thumbBtnClass(sceneRating, 'FAILED')} title="Scene failed">
              {thumbDown}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide drop-shadow">Product</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => rate(undefined, 'GOOD')} className={thumbBtnClass(productRating, 'GOOD')} title="Product good">
              {thumbUp}
            </button>
            <button type="button" onClick={() => rate(undefined, 'FAILED')} className={thumbBtnClass(productRating, 'FAILED')} title="Product failed">
              {thumbDown}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

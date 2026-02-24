'use client';

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
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(!!cached);

  useEffect(() => {
    if (fetched) return;
    let cancelled = false;
    fetch(`/api/v1/generations/${generationId}`, { cache: 'no-store' })
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
      if (scene !== undefined) setSceneRating(scene);
      if (product !== undefined) setProductRating(product);

      setLoading(true);
      try {
        const body: Record<string, string> = {};
        if (scene !== undefined) body.scene_accuracy_rating = scene;
        if (product !== undefined) body.product_accuracy_rating = product;
        const res = await fetch(`/api/v1/generations/${generationId}/rating`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = await res.json();
          const d = json.data ?? json;
          const newScene: Rating = d.scene_accuracy_rating ?? prevScene;
          const newProduct: Rating = d.product_accuracy_rating ?? prevProduct;
          setSceneRating(newScene);
          setProductRating(newProduct);
          ratingCache.set(generationId, { scene: newScene, product: newProduct });
          onRated?.();
        } else {
          setSceneRating(prevScene);
          setProductRating(prevProduct);
        }
      } catch {
        setSceneRating(prevScene);
        setProductRating(prevProduct);
      } finally {
        setLoading(false);
      }
    },
    [generationId, onRated, sceneRating, productRating],
  );

  const thumbUp = (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 11V4a3 3 0 0 1 3-3h7" />
    </svg>
  );
  const thumbDown = (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13v7" />
    </svg>
  );

  const btnBase = 'rounded-md p-1.5 transition-all disabled:opacity-50';

  function thumbBtnClass(current: Rating, target: 'GOOD' | 'FAILED') {
    if (current === target) {
      return target === 'GOOD'
        ? `${btnBase} bg-green-500 text-white shadow-sm ring-1 ring-green-400`
        : `${btnBase} bg-red-500 text-white shadow-sm ring-1 ring-red-400`;
    }
    return target === 'GOOD'
      ? `${btnBase} text-green-300 hover:bg-green-500/30 hover:text-green-200`
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
            <button type="button" onClick={() => rate('GOOD')} disabled={loading} className={thumbBtnClass(sceneRating, 'GOOD')} title="Scene good">
              {thumbUp}
            </button>
            <button type="button" onClick={() => rate('FAILED')} disabled={loading} className={thumbBtnClass(sceneRating, 'FAILED')} title="Scene failed">
              {thumbDown}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide drop-shadow">Product</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => rate(undefined, 'GOOD')} disabled={loading} className={thumbBtnClass(productRating, 'GOOD')} title="Product good">
              {thumbUp}
            </button>
            <button type="button" onClick={() => rate(undefined, 'FAILED')} disabled={loading} className={thumbBtnClass(productRating, 'FAILED')} title="Product failed">
              {thumbDown}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

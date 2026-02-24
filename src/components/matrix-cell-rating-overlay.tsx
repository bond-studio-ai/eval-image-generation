'use client';

import { useCallback, useState } from 'react';

interface MatrixCellRatingOverlayProps {
  generationId: string;
  onRated?: () => void;
  className?: string;
}

/** Renders an overlay with scene/product thumbs up/down. Place inside a group-hover parent (e.g. button.group). */
export function MatrixCellRatingOverlay({
  generationId,
  onRated,
  className = '',
}: MatrixCellRatingOverlayProps) {
  const [loading, setLoading] = useState(false);

  const rate = useCallback(
    async (scene?: 'GOOD' | 'FAILED', product?: 'GOOD' | 'FAILED') => {
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
        if (res.ok) onRated?.();
      } catch { /* ignore */ }
      finally { setLoading(false); }
    },
    [generationId, onRated],
  );

  const btn = 'rounded p-1.5 text-white/95 hover:bg-white/20 hover:text-white disabled:opacity-50 transition-colors';
  const thumbUp = (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 11V4a3 3 0 0 1 3-3h7" /></svg>
  );
  const thumbDown = (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13v7" /></svg>
  );

  return (
    <div
      className={`absolute inset-0 flex flex-col items-stretch justify-end rounded-lg bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-white">
        <div className="flex items-center gap-1.5">
          <span className="w-12 shrink-0 text-[10px] font-medium uppercase tracking-wide drop-shadow">Scene</span>
          <button type="button" onClick={() => rate('GOOD')} disabled={loading} className={`${btn} text-green-300`} title="Scene good">
            {thumbUp}
          </button>
          <button type="button" onClick={() => rate('FAILED')} disabled={loading} className={`${btn} text-orange-300`} title="Scene failed">
            {thumbDown}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-12 shrink-0 text-[10px] font-medium uppercase tracking-wide drop-shadow">Product</span>
          <button type="button" onClick={() => rate(undefined, 'GOOD')} disabled={loading} className={`${btn} text-green-300`} title="Product good">
            {thumbUp}
          </button>
          <button type="button" onClick={() => rate(undefined, 'FAILED')} disabled={loading} className={`${btn} text-orange-300`} title="Product failed">
            {thumbDown}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "@/components/ui/icons";
import { serviceUrl } from "@/lib/api-base";

type Rating = "GOOD" | "FAILED" | null;

interface GenerationRating {
  scene: Rating;
  product: Rating;
}

interface MatrixCellRatingOverlayProps {
  generationId: string;
  onRated?: () => void;
  className?: string;
}

const thumbUp = <ThumbsUpIcon className="size-4" fill="currentColor" aria-hidden />;
const thumbDown = <ThumbsDownIcon className="size-4" fill="currentColor" aria-hidden />;

export function MatrixCellRatingOverlay({ generationId, onRated, className = "" }: MatrixCellRatingOverlayProps) {
  const queryClient = useQueryClient();
  const ratingKey = ["generation-rating", generationId];

  const { data } = useQuery({
    queryKey: ratingKey,
    queryFn: async ({ signal }): Promise<GenerationRating> => {
      const res = await fetch(serviceUrl(`generations/${generationId}`), {
        cache: "no-store",
        signal
      });
      if (!res.ok) throw new Error(`Failed to load generation (${res.status})`);
      const json = await res.json();
      const d = json.data ?? json;
      return {
        scene: (d.sceneAccuracyRating ?? null) as Rating,
        product: (d.productAccuracyRating ?? null) as Rating
      };
    },
    enabled: !!generationId,
    // Match the prior module-level cache: fetch a generation's rating once and
    // keep it; the optimistic `setQueryData` in `rate` handles in-session updates.
    staleTime: Infinity
  });

  const sceneRating = data?.scene ?? null;
  const productRating = data?.product ?? null;

  const rate = useCallback(
    async (scene?: "GOOD" | "FAILED", product?: "GOOD" | "FAILED") => {
      const key = ["generation-rating", generationId];
      const prev = queryClient.getQueryData<GenerationRating>(key) ?? {
        scene: null,
        product: null
      };

      // Optimistic update: write straight to the query cache.
      const nextScene = scene !== undefined ? scene : prev.scene;
      const nextProduct = product !== undefined ? product : prev.product;
      queryClient.setQueryData<GenerationRating>(key, { scene: nextScene, product: nextProduct });
      onRated?.();

      try {
        const body: Record<string, string> = {};
        if (scene !== undefined) body["sceneAccuracyRating"] = scene;
        if (product !== undefined) body["productAccuracyRating"] = product;
        const res = await fetch(serviceUrl(`generations/${generationId}/rating`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const json = await res.json();
          const d = json.data ?? json;
          queryClient.setQueryData<GenerationRating>(key, {
            scene: (d.sceneAccuracyRating ?? nextScene) as Rating,
            product: (d.productAccuracyRating ?? nextProduct) as Rating
          });
        } else {
          queryClient.setQueryData<GenerationRating>(key, prev);
        }
      } catch {
        queryClient.setQueryData<GenerationRating>(key, prev);
      }
    },
    [generationId, onRated, queryClient]
  );

  const btnBase = "rounded-md p-1.5 transition-all";

  function thumbBtnClass(current: Rating, target: "GOOD" | "FAILED") {
    if (current === target) {
      return target === "GOOD" ? `${btnBase} bg-primary-500 text-text-inverse shadow-sm ring-1 ring-primary-400` : `${btnBase} bg-danger-500 text-text-inverse shadow-sm ring-1 ring-danger-400`;
    }
    return target === "GOOD" ? `${btnBase} text-primary-300 hover:bg-primary-500/30 hover:text-primary-200` : `${btnBase} text-danger-300 hover:bg-danger-500/30 hover:text-danger-200`;
  }

  return (
    <div
      className={`from-overlay/70 absolute inset-x-0 bottom-0 flex items-end justify-center rounded-b-lg bg-gradient-to-t to-transparent px-2 pt-8 pb-2 opacity-0 transition-opacity group-hover:opacity-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-text-inverse flex gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tracking-wide uppercase drop-shadow">Scene</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => rate("GOOD")} className={thumbBtnClass(sceneRating, "GOOD")} title="Scene good">
              {thumbUp}
            </button>
            <button type="button" onClick={() => rate("FAILED")} className={thumbBtnClass(sceneRating, "FAILED")} title="Scene failed">
              {thumbDown}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tracking-wide uppercase drop-shadow">Product</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => rate(undefined, "GOOD")} className={thumbBtnClass(productRating, "GOOD")} title="Product good">
              {thumbUp}
            </button>
            <button type="button" onClick={() => rate(undefined, "FAILED")} className={thumbBtnClass(productRating, "FAILED")} title="Product failed">
              {thumbDown}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

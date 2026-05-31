"use client";

import { useCallback, useEffect, useState } from "react";
import { serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { strategyDetailPerformanceResponseSchema } from "@/lib/api/schemas";

interface PerformanceData {
  generationCount: number;
  sceneGoodCount: number;
  sceneFailedCount: number;
  sceneRatedCount: number;
  productGoodCount: number;
  productFailedCount: number;
  productRatedCount: number;
  notRatedCount: number;
  sceneGoodPct: number;
  sceneFailedPct: number;
  productGoodPct: number;
  productFailedPct: number;
  notRatedPct: number;
  avgExecutionTimeMs: number | null;
}

export function StrategyPerformance({ strategyId }: { strategyId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const json = await fetchJson(serviceUrl(`strategies/${strategyId}/performance`), strategyDetailPerformanceResponseSchema, { cache: "no-store" });
      setData(json.data ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [strategyId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="border-border bg-surface mt-8 rounded-lg border p-5 shadow-xs">
        <h2 className="text-text-primary text-h3">Strategy performance</h2>
        <p className="text-text-muted text-body mt-2">Loading…</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { generationCount, sceneGoodPct, sceneFailedPct, productGoodPct, productFailedPct, notRatedCount, sceneRatedCount, productRatedCount, avgExecutionTimeMs } = data;

  return (
    <div className="border-border bg-surface mt-8 rounded-lg border p-5 shadow-xs">
      <h2 className="text-text-primary text-h3">Strategy performance</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <div>
          <p className="text-text-muted text-caption font-medium">Generations</p>
          <p className="text-text-primary text-h2 mt-0.5">{generationCount}</p>
        </div>
        <div>
          <p className="text-text-muted text-caption font-medium">Good (scene)</p>
          <p className="text-success-600 text-h2 mt-0.5">{sceneGoodPct}%</p>
          <p className="text-text-disabled text-[10px]">{sceneRatedCount} rated</p>
        </div>
        <div>
          <p className="text-text-muted text-caption font-medium">Bad (scene)</p>
          <p className="text-warning-600 text-h2 mt-0.5">{sceneFailedPct}%</p>
        </div>
        <div>
          <p className="text-text-muted text-caption font-medium">Good (product)</p>
          <p className="text-success-600 text-h2 mt-0.5">{productGoodPct}%</p>
          <p className="text-text-disabled text-[10px]">{productRatedCount} rated</p>
        </div>
        <div>
          <p className="text-text-muted text-caption font-medium">Bad (product)</p>
          <p className="text-warning-600 text-h2 mt-0.5">{productFailedPct}%</p>
        </div>
        <div>
          <p className="text-text-muted text-caption font-medium">Not rated</p>
          <p className="text-text-secondary text-h2 mt-0.5">{notRatedCount}</p>
        </div>
        <div>
          <p className="text-text-muted text-caption font-medium">Avg exec time</p>
          <p className="text-text-primary text-h2 mt-0.5">{avgExecutionTimeMs == null ? "—" : `${(avgExecutionTimeMs / 1000).toFixed(1)}s`}</p>
        </div>
      </div>
    </div>
  );
}

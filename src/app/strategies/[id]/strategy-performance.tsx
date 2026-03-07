'use client';

import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useState } from 'react';

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
      const res = await fetch(serviceUrl(`strategies/${strategyId}/performance`), { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setData(json.data ?? null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [strategyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const {
    generationCount, sceneGoodPct, sceneFailedPct, productGoodPct, productFailedPct,
    notRatedCount, sceneRatedCount, productRatedCount, avgExecutionTimeMs,
  } = data;

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <div>
          <p className="text-xs font-medium text-gray-500">Generations</p>
          <p className="mt-0.5 text-xl font-semibold text-gray-900">{generationCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Good (scene)</p>
          <p className="mt-0.5 text-xl font-semibold text-green-600">{sceneGoodPct}%</p>
          <p className="text-[10px] text-gray-400">{sceneRatedCount} rated</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Bad (scene)</p>
          <p className="mt-0.5 text-xl font-semibold text-orange-600">{sceneFailedPct}%</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Good (product)</p>
          <p className="mt-0.5 text-xl font-semibold text-green-600">{productGoodPct}%</p>
          <p className="text-[10px] text-gray-400">{productRatedCount} rated</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Bad (product)</p>
          <p className="mt-0.5 text-xl font-semibold text-orange-600">{productFailedPct}%</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Not rated</p>
          <p className="mt-0.5 text-xl font-semibold text-gray-600">{notRatedCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Avg exec time</p>
          <p className="mt-0.5 text-xl font-semibold text-gray-900">
            {avgExecutionTimeMs != null ? `${(avgExecutionTimeMs / 1000).toFixed(1)}s` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

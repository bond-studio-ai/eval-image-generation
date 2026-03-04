'use client';

import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useState } from 'react';

interface PerformanceData {
  generation_count: number;
  scene_good_count: number;
  scene_failed_count: number;
  scene_rated_count: number;
  product_good_count: number;
  product_failed_count: number;
  product_rated_count: number;
  not_rated_count: number;
  scene_good_pct: number;
  scene_failed_pct: number;
  product_good_pct: number;
  product_failed_pct: number;
  not_rated_pct: number;
  avg_execution_time_ms: number | null;
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
    generation_count, scene_good_pct, scene_failed_pct, product_good_pct, product_failed_pct,
    not_rated_count, scene_rated_count, product_rated_count, avg_execution_time_ms,
  } = data;

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <div>
          <p className="text-xs font-medium text-gray-500">Generations</p>
          <p className="mt-0.5 text-xl font-semibold text-gray-900">{generation_count}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Good (scene)</p>
          <p className="mt-0.5 text-xl font-semibold text-green-600">{scene_good_pct}%</p>
          <p className="text-[10px] text-gray-400">{scene_rated_count} rated</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Bad (scene)</p>
          <p className="mt-0.5 text-xl font-semibold text-orange-600">{scene_failed_pct}%</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Good (product)</p>
          <p className="mt-0.5 text-xl font-semibold text-green-600">{product_good_pct}%</p>
          <p className="text-[10px] text-gray-400">{product_rated_count} rated</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Bad (product)</p>
          <p className="mt-0.5 text-xl font-semibold text-orange-600">{product_failed_pct}%</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Not rated</p>
          <p className="mt-0.5 text-xl font-semibold text-gray-600">{not_rated_count}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Avg exec time</p>
          <p className="mt-0.5 text-xl font-semibold text-gray-900">
            {avg_execution_time_ms != null ? `${(avg_execution_time_ms / 1000).toFixed(1)}s` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

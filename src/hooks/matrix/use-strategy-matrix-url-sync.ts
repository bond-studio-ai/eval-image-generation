'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { StrategyMatrixParams, searchParamsToStrategyMatrixParams } from './strategy-matrix-types';

/**
 * Reads strategy-matrix params from the URL and provides an updater that keeps the URL in sync.
 * Use on the Matrix page so filters are shareable and back/forward work.
 */
export function useStrategyMatrixUrlSync() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => searchParamsToStrategyMatrixParams(searchParams),
    [searchParams]
  );

  const setParams = useCallback(
    (next: Partial<StrategyMatrixParams>) => {
      const merged = { ...params, ...next };
      const q = new URLSearchParams();
      if (merged.model?.trim()) q.set('model', merged.model.trim());
      if (merged.minTemperature?.trim()) q.set('minTemperature', merged.minTemperature.trim());
      if (merged.maxTemperature?.trim()) q.set('maxTemperature', merged.maxTemperature.trim());
      if (merged.minCoverage?.trim()) q.set('minCoverage', merged.minCoverage.trim());
      if (merged.minImages?.trim()) q.set('minImages', merged.minImages.trim());
      if (merged.sceneWeight?.trim()) q.set('sceneWeight', merged.sceneWeight.trim());
      if (merged.productWeight?.trim()) q.set('productWeight', merged.productWeight.trim());
      if (merged.sort?.trim()) q.set('sort', merged.sort.trim());
      if (merged.order) q.set('order', merged.order);
      const queryString = q.toString();
      router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`);
    },
    [pathname, params, router]
  );

  return { params, setParams };
}

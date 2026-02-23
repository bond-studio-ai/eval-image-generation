'use client';

import { useQuery } from '@tanstack/react-query';
import type { StrategyMatrixParams, StrategyMatrixResponse } from '@/hooks/matrix/strategy-matrix-types';
import { strategyMatrixApiUrl } from '@/hooks/matrix/strategy-matrix-types';

async function fetchStrategyMatrix(params: StrategyMatrixParams): Promise<StrategyMatrixResponse> {
  const url = strategyMatrixApiUrl(params);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load strategy matrix');
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'API error');
  return json.data;
}

export const strategyMatrixQueryKey = (params: StrategyMatrixParams) =>
  ['strategy-matrix', params] as const;

export function useStrategyMatrix(params: StrategyMatrixParams) {
  return useQuery({
    queryKey: strategyMatrixQueryKey(params),
    queryFn: () => fetchStrategyMatrix(params),
  });
}

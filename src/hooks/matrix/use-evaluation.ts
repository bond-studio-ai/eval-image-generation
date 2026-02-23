'use client';

import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

export interface CategoryEval {
  issues: string[];
  notes: string;
}

export interface EvaluationData {
  product_accuracy: Record<string, CategoryEval>;
  scene_accuracy_issues: string[];
  scene_accuracy_notes: string;
}

const evaluationQueryKey = (resultId: string) => ['evaluation', resultId] as const;

async function fetchEvaluation(resultId: string): Promise<EvaluationData> {
  const res = await fetch(`/api/v1/evaluations/${resultId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch evaluation');
  const json = await res.json();
  const d = json?.data;
  return {
    product_accuracy: d?.product_accuracy ?? {},
    scene_accuracy_issues: Array.isArray(d?.scene_accuracy_issues) ? d.scene_accuracy_issues : [],
    scene_accuracy_notes: d?.scene_accuracy_notes ?? '',
  };
}

async function saveEvaluation(resultId: string, payload: Omit<EvaluationData, 'product_accuracy'> & { product_accuracy?: Record<string, CategoryEval> }): Promise<unknown> {
  const res = await fetch('/api/v1/evaluations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result_id: resultId,
      product_accuracy: payload.product_accuracy ?? {},
      scene_accuracy_issues: payload.scene_accuracy_issues ?? [],
      scene_accuracy_notes: payload.scene_accuracy_notes ?? '',
    }),
  });
  if (!res.ok) throw new Error('Failed to save evaluation');
  return res.json();
}

export function useEvaluation(resultId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: resultId ? evaluationQueryKey(resultId) : ['evaluation', null],
    queryFn: () => fetchEvaluation(resultId!),
    enabled: !!resultId,
  });

  const mutation = useMutation({
    mutationFn: (payload: EvaluationData) => saveEvaluation(resultId!, payload),
    onSuccess: (_, variables) => {
      if (resultId) {
        queryClient.setQueryData(evaluationQueryKey(resultId), variables);
      }
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    save: mutation.mutate,
    saveAsync: mutation.mutateAsync,
  };
}

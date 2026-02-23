'use client';

import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

const generationQueryKey = (id: string) => ['generation', id] as const;

type RatingPayload = { scene_accuracy_rating?: string; product_accuracy_rating?: string };

async function fetchGeneration(id: string) {
  const res = await fetch(`/api/v1/generations/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

async function patchRating(id: string, payload: RatingPayload): Promise<unknown> {
  const res = await fetch(`/api/v1/generations/${id}/rating`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update rating');
  return res.json();
}

export function useGenerationRating(generationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: generationId ? generationQueryKey(generationId) : ['generation', null],
    queryFn: () => fetchGeneration(generationId!),
    enabled: !!generationId,
  });

  const mutation = useMutation({
    mutationFn: (payload: RatingPayload) =>
      generationId ? patchRating(generationId, payload) : Promise.reject(new Error('No generation ID')),
    onSuccess: (_, variables) => {
      if (generationId) {
        queryClient.setQueryData(generationQueryKey(generationId), (old: unknown) => {
          const prev = old as RatingPayload & Record<string, unknown> | undefined;
          if (!prev) return prev;
          return {
            ...prev,
            ...(variables.scene_accuracy_rating !== undefined && { scene_accuracy_rating: variables.scene_accuracy_rating }),
            ...(variables.product_accuracy_rating !== undefined && { product_accuracy_rating: variables.product_accuracy_rating }),
          };
        });
        queryClient.invalidateQueries({ queryKey: ['strategy-matrix'] });
      }
    },
  });

  const data = query.data;
  const sceneRating = data?.scene_accuracy_rating ?? null;
  const productRating = data?.product_accuracy_rating ?? null;
  const ratingsLoaded = !generationId || query.isSuccess;
  const isRating = mutation.isPending;

  const updateRating = (field: 'scene_accuracy_rating' | 'product_accuracy_rating', value: string) => {
    if (!generationId) return;
    mutation.mutate({ [field]: value });
  };

  return {
    isLoading: query.isLoading,
    sceneRating,
    productRating,
    ratingsLoaded,
    isRating,
    updateRating,
  };
}

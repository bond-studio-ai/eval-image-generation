'use client';

import { DeleteGenerationButton } from '@/components/delete-generation-button';
import { GenerationThumbnails } from '@/components/generation-thumbnails';
import { RatingBadge } from '@/components/rating-badge';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface GenerationRow {
  id: string;
  promptVersionId: string;
  promptName: string | null;
  resultRating: string | null;
  notes: string | null;
  executionTime: number | null;
  createdAt: string;
  resultUrls: string[];
  resultCount: number;
}

interface GenerationsListProps {
  initialData: GenerationRow[];
  initialTotal: number;
  pageSize: number;
  filters: {
    rating?: string;
    unrated?: string;
    prompt_version_id?: string;
    from?: string;
    to?: string;
  };
}

function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export function GenerationsList({ initialData, initialTotal, pageSize, filters }: GenerationsListProps) {
  const [generations, setGenerations] = useState<GenerationRow[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1); // page 1 = initial data already loaded
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = generations.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
    if (filters.rating) params.set('rating', filters.rating);
    if (filters.unrated) params.set('unrated', filters.unrated);
    if (filters.prompt_version_id) params.set('prompt_version_id', filters.prompt_version_id);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);

    try {
      const res = await fetch(`/api/v1/generations?${params}`);
      const json = await res.json();

      if (json.data) {
        const newRows: GenerationRow[] = json.data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          promptVersionId: row.promptVersionId as string,
          promptName: row.promptName as string | null,
          resultRating: row.resultRating as string | null,
          notes: row.notes as string | null,
          executionTime: row.executionTime as number | null,
          createdAt: row.createdAt as string,
          resultUrls: (row.result_urls ?? []) as string[],
          resultCount: (row.result_count ?? 0) as number,
        }));
        setGenerations((prev) => [...prev, ...newRows]);
        setPage(nextPage);
        if (json.pagination?.total !== undefined) {
          setTotal(json.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to load more generations:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, pageSize, filters]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
              Output
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
              Prompt
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
              Rating
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
              Results
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {generations.map((gen) => (
            <tr key={gen.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <GenerationThumbnails urls={gen.resultUrls} />
              </td>
              <td className="px-6 py-4 text-sm">
                <Link
                  href={`/generations/${gen.id}`}
                  className="hover:text-primary-600 font-medium text-gray-900"
                >
                  {gen.promptName || 'Untitled'}
                </Link>
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">
                <RatingBadge rating={gen.resultRating} />
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                {gen.resultCount} result{gen.resultCount !== 1 ? 's' : ''}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                {gen.executionTime ? `${(gen.executionTime / 1000).toFixed(1)}s` : '-'}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                {new Date(gen.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <DeleteGenerationButton generationId={gen.id} variant="icon" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Infinite scroll sentinel + status */}
      <div ref={sentinelRef} className="flex items-center justify-center py-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner className="h-4 w-4" />
            Loading more...
          </div>
        )}
        {!loading && !hasMore && generations.length > 0 && (
          <p className="text-xs text-gray-400">
            Showing all {total} generation{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import { DeleteGenerationButton } from '@/components/delete-generation-button';
import { GenerationThumbnails } from '@/components/generation-thumbnails';
import { RatingBadge } from '@/components/rating-badge';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface GenerationRow {
  id: string;
  promptVersionId: string;
  promptName: string | null;
  sceneAccuracyRating: string | null;
  productAccuracyRating: string | null;
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
    scene_accuracy_rating?: string;
    product_accuracy_rating?: string;
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
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = generations.length < total;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === generations.length) return new Set();
      return new Set(generations.map((g) => g.id));
    });
  }, [generations]);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selected];
    const res = await fetch('/api/v1/generations/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setGenerations((prev) => prev.filter((g) => !selected.has(g.id)));
      setTotal((prev) => prev - ids.length);
      setSelected(new Set());
    }
  }, [selected]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
    if (filters.scene_accuracy_rating) params.set('scene_accuracy_rating', filters.scene_accuracy_rating);
    if (filters.product_accuracy_rating) params.set('product_accuracy_rating', filters.product_accuracy_rating);
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
          sceneAccuracyRating: row.sceneAccuracyRating as string | null,
          productAccuracyRating: row.productAccuracyRating as string | null,
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

  const allSelected = generations.length > 0 && selected.size === generations.length;

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
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
              <tr key={gen.id} className={`hover:bg-gray-50 ${selected.has(gen.id) ? 'bg-primary-50/50' : ''}`}>
                <td className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(gen.id)}
                    onChange={() => toggleSelect(gen.id)}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
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
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-wrap gap-1">
                    <RatingBadge rating={gen.sceneAccuracyRating} label="Scene" />
                    <RatingBadge rating={gen.productAccuracyRating} label="Product" />
                  </div>
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

        <div ref={sentinelRef}>
          {loading && (
            <div className="divide-y divide-gray-200">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded border border-gray-200 bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && !hasMore && generations.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <p className="text-xs text-gray-400">
                Showing all {total} generation{total !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelected(new Set())}
        entityName="generations"
      />
    </>
  );
}

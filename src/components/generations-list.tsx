'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import { DataTable, SelectAllCheckbox, type DataTableColumn } from '@/components/data-table';
import { actionsColumn, checkboxColumn } from '@/components/data-table-utils';
import { DeleteGenerationButton } from '@/components/delete-generation-button';
import { GenerationThumbnails } from '@/components/generation-thumbnails';
import { RatingBadge } from '@/components/rating-badge';
import { serviceUrl } from '@/lib/api-base';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
    sceneAccuracyRating?: string;
    productAccuracyRating?: string;
    unrated?: string;
    promptVersionId?: string;
    from?: string;
    to?: string;
    sort?: string;
    order?: string;
    source?: string;
  };
}

function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function GenerationsList({
  initialData,
  initialTotal,
  pageSize,
  filters,
}: GenerationsListProps) {
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
    const res = await fetch(serviceUrl('generations/bulk-delete'), {
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
    if (filters.sceneAccuracyRating) params.set('sceneAccuracyRating', filters.sceneAccuracyRating);
    if (filters.productAccuracyRating)
      params.set('productAccuracyRating', filters.productAccuracyRating);
    if (filters.unrated) params.set('unrated', filters.unrated);
    if (filters.promptVersionId) params.set('promptVersionId', filters.promptVersionId);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.order) params.set('order', filters.order);
    if (filters.source === 'benchmark') params.set('source', 'benchmark');

    try {
      const res = await fetch(serviceUrl(`generations?${params}`));
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
          resultUrls: (row.resultUrls ?? []) as string[],
          resultCount: (row.resultCount ?? 0) as number,
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

  const columns = useMemo<DataTableColumn<GenerationRow>[]>(
    () => [
      checkboxColumn<GenerationRow>({
        selected,
        onToggle: toggleSelect,
        rowId: (gen) => gen.id,
      }),
      {
        header: 'Output',
        cell: (gen) => <GenerationThumbnails urls={gen.resultUrls} />,
        cellClassName: 'px-4 py-3',
      },
      {
        header: 'Prompt',
        cell: (gen) => (
          <Link
            href={`/generations/${gen.id}`}
            className="hover:text-primary-600 font-medium text-gray-900"
          >
            {gen.promptName || 'Untitled'}
          </Link>
        ),
      },
      {
        header: 'Rating',
        cell: (gen) => (
          <div className="flex flex-wrap gap-1">
            <RatingBadge rating={gen.sceneAccuracyRating} label="Scene" />
            <RatingBadge rating={gen.productAccuracyRating} label="Product" />
          </div>
        ),
      },
      {
        header: 'Results',
        cell: (gen) => `${gen.resultCount} result${gen.resultCount !== 1 ? 's' : ''}`,
      },
      {
        header: 'Time',
        cell: (gen) => (gen.executionTime ? `${(gen.executionTime / 1000).toFixed(1)}s` : '-'),
      },
      {
        header: 'Created',
        cell: (gen) => new Date(gen.createdAt).toLocaleDateString(),
      },
      actionsColumn<GenerationRow>([
        { render: (gen) => <DeleteGenerationButton generationId={gen.id} variant="icon" /> },
      ]),
    ],
    [selected, toggleSelect],
  );

  const toolbar = (
    <div className="flex items-center justify-end">
      <SelectAllCheckbox count={selected.size} total={generations.length} onToggle={toggleAll} />
    </div>
  );

  const footer = (
    <div ref={sentinelRef}>
      {loading && (
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="size-12 shrink-0 animate-pulse rounded border border-gray-200 bg-gray-200" />
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
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={generations}
        rowKey={(gen) => gen.id}
        rowClassName={(gen) => `hover:bg-gray-50 ${selected.has(gen.id) ? 'bg-primary-50/50' : ''}`}
        toolbar={toolbar}
        footer={footer}
        className="mt-6"
      />

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelected(new Set())}
        entityName="generations"
      />
    </>
  );
}

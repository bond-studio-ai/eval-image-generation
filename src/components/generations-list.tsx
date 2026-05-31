"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { DataTable, type DataTableColumn, SelectAllCheckbox } from "@/components/data-table";
import { actionsColumn, checkboxColumn } from "@/components/data-table-utils";
import { DeleteGenerationButton } from "@/components/delete-generation-button";
import { GenerationThumbnails } from "@/components/generation-thumbnails";
import { RatingBadge } from "@/components/rating-badge";
import { serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { generationListResponseSchema } from "@/lib/api/schemas";
import { logger } from "@/lib/logger";
import { type GenerationRow, normalizeGenerationRow } from "@/lib/generation-row";

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

export function GenerationsList({ initialData, initialTotal, pageSize, filters }: GenerationsListProps) {
  const [generations, setGenerations] = useState<GenerationRow[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
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
      return new Set(generations.map((generation) => generation.id));
    });
  }, [generations]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selected);
    const res = await fetch(serviceUrl("generations/bulk-delete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });
    if (res.ok) {
      setGenerations((prev) => prev.filter((generation) => !selected.has(generation.id)));
      setTotal((prev) => prev - ids.length);
      setSelected(new Set());
    }
  }, [selected]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const nextPage = pageRef.current + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
    if (filters.sceneAccuracyRating) params.set("sceneAccuracyRating", filters.sceneAccuracyRating);
    if (filters.productAccuracyRating) params.set("productAccuracyRating", filters.productAccuracyRating);
    if (filters.unrated) params.set("unrated", filters.unrated);
    if (filters.promptVersionId) params.set("promptVersionId", filters.promptVersionId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.order) params.set("order", filters.order);
    if (filters.source === "benchmark") params.set("source", "benchmark");

    try {
      const json = await fetchJson(serviceUrl(`generations?${params}`), generationListResponseSchema);

      const newRows: GenerationRow[] = json.data.map(normalizeGenerationRow);
      setGenerations((prev) => [...prev, ...newRows]);
      pageRef.current = nextPage;
      const newTotal = json.pagination?.total;
      if (newTotal !== undefined) {
        setTotal(newTotal);
      }
    } catch (error) {
      logger.error("Failed to load more generations:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, pageSize, filters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  const columns = useMemo<DataTableColumn<GenerationRow>[]>(
    () => [
      checkboxColumn<GenerationRow>({
        selected,
        onToggle: toggleSelect,
        rowId: (gen) => gen.id
      }),
      {
        header: "Output",
        cell: (gen) => <GenerationThumbnails urls={gen.resultUrls} />,
        cellClassName: "px-4 py-3"
      },
      {
        header: "Prompt",
        cell: (gen) => (
          <Link href={`/generations/${gen.id}`} className="hover:text-primary-600 text-text-primary font-medium">
            {gen.promptName || "Untitled"}
          </Link>
        )
      },
      {
        header: "Rating",
        cell: (gen) => (
          <div className="flex flex-wrap gap-1">
            <RatingBadge rating={gen.sceneAccuracyRating} label="Scene" />
            <RatingBadge rating={gen.productAccuracyRating} label="Product" />
          </div>
        )
      },
      {
        header: "Results",
        cell: (gen) => `${gen.resultCount} result${gen.resultCount === 1 ? "" : "s"}`
      },
      {
        header: "Time",
        cell: (gen) => (gen.executionTime ? `${(gen.executionTime / 1000).toFixed(1)}s` : "-")
      },
      {
        header: "Created",
        cell: (gen) => new Date(gen.createdAt).toLocaleDateString()
      },
      actionsColumn<GenerationRow>([{ render: (gen) => <DeleteGenerationButton generationId={gen.id} variant="icon" /> }])
    ],
    [selected, toggleSelect]
  );

  const toolbar = (
    <div className="flex items-center justify-end">
      <SelectAllCheckbox count={selected.size} total={generations.length} onToggle={toggleAll} />
    </div>
  );

  const footer = (
    <div ref={sentinelRef}>
      {loading && (
        <div className="divide-border divide-y">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="border-border bg-border size-12 shrink-0 animate-pulse rounded border" />
              <div className="flex-1 space-y-2">
                <div className="bg-border h-4 w-32 animate-pulse rounded" />
                <div className="bg-surface-sunken h-3 w-20 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && !hasMore && generations.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <p className="text-text-disabled text-caption">
            Showing all {total} generation{total === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DataTable columns={columns} data={generations} rowKey={(gen) => gen.id} rowClassName={(gen) => `hover:bg-surface-muted ${selected.has(gen.id) ? "bg-primary-50/50" : ""}`} toolbar={toolbar} footer={footer} className="mt-6" />

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => {
          setSelected(new Set());
        }}
        entityName="generations"
      />
    </>
  );
}

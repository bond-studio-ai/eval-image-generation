"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSearch } from "@/components/ui/filter-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { serviceUrl } from "@/lib/api-base";
import { RunGroupRow } from "./run-group-row";
import { type AuditRunGroup, PAGE_SIZE, type RunListItem, SOURCE_FILTER_OPTIONS, type SourceFilter } from "./run-picker-types";

function toIsoStart(date: string): string {
  return new Date(`${date}T00:00:00Z`).toISOString();
}

function toIsoEnd(date: string): string {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

interface FiltersState {
  filterText: string;
  dateFrom: string;
  dateTo: string;
  sourceFilter: SourceFilter;
}

type FiltersAction = { type: "setFilterText"; value: string } | { type: "setDateFrom"; value: string } | { type: "setDateTo"; value: string } | { type: "setSourceFilter"; value: SourceFilter } | { type: "clearDates" };

const INITIAL_FILTERS: FiltersState = {
  filterText: "",
  dateFrom: "",
  dateTo: "",
  sourceFilter: "all"
};

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case "clearDates": {
      return { ...state, dateFrom: "", dateTo: "" };
    }
    case "setDateFrom": {
      return { ...state, dateFrom: action.value };
    }
    case "setDateTo": {
      return { ...state, dateTo: action.value };
    }
    case "setFilterText": {
      return { ...state, filterText: action.value };
    }
    case "setSourceFilter": {
      return { ...state, sourceFilter: action.value };
    }
  }
}

interface RunPickerProps {
  leftId: string | null;
  rightId: string | null;
  onToggle: (id: string) => void;
  onClearLeft: () => void;
  onClearRight: () => void;
  onClearAll: () => void;
}

export function RunPicker({ leftId, rightId, onToggle, onClearLeft, onClearRight, onClearAll }: RunPickerProps) {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, dispatchFilters] = useReducer(filtersReducer, INITIAL_FILTERS);
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const hasMore = runs.length < total;

  const fetchRuns = useCallback(
    async (opts: { replace?: boolean; pageToFetch?: number } = {}) => {
      const replace = opts.replace ?? false;
      const pageToFetch = opts.pageToFetch ?? 1;
      if (replace) setError(null);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          page: String(pageToFetch),
          limit: String(PAGE_SIZE),
          individual_only: "false"
        });
        if (filters.dateFrom) params.set("from", toIsoStart(filters.dateFrom));
        if (filters.dateTo) params.set("to", toIsoEnd(filters.dateTo));

        const res = await fetch(serviceUrl(`strategy-runs?${params}`), {
          cache: "no-store"
        });
        if (!res.ok) {
          setError(`Failed to load runs (${res.status})`);
          return;
        }
        const json = (await res.json()) as { data?: unknown; pagination?: { total?: unknown } };
        const data = (json.data ?? []) as RunListItem[];
        const paginationTotal = Number(json.pagination?.total ?? 0);

        if (replace) {
          setRuns(data);
          setTotal(paginationTotal);
          pageRef.current = 1;
        } else {
          setRuns((prev) => [...prev, ...data]);
          setTotal(paginationTotal);
          pageRef.current = pageToFetch;
        }
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : "Unknown error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters.dateFrom, filters.dateTo]
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    void fetchRuns({ replace: false, pageToFetch: pageRef.current + 1 });
  }, [hasMore, loadingMore, fetchRuns]);

  useEffect(() => {
    setLoading(true);
    void fetchRuns({ replace: true });
  }, [fetchRuns]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: "200px", threshold: 0 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
    };
  }, [hasMore, loadingMore, loadMore]);

  const filteredByText = filters.filterText
    ? runs.filter((run) => {
        const query = filters.filterText.toLowerCase();
        return run.id.toLowerCase().includes(query) || (run.strategyName ?? "").toLowerCase().includes(query) || (run.inputPresetName ?? "").toLowerCase().includes(query) || (run.source ?? "").toLowerCase().includes(query);
      })
    : runs;
  const filtered = filteredByText.filter((run) => (filters.sourceFilter === "all" ? true : filters.sourceFilter === "preset" ? run.source === "preset" || Boolean(run.inputPresetName) : run.source === "raw_input"));
  const runGroups = useMemo<AuditRunGroup[]>(() => {
    const groups = new Map<string, AuditRunGroup>();
    for (const run of filtered) {
      const groupingId = run.groupId ?? run.batchRunId ?? run.id;
      const existing = groups.get(groupingId);
      if (existing) {
        existing.runs.push(run);
        continue;
      }
      groups.set(groupingId, {
        id: groupingId,
        batchRunId: run.batchRunId,
        groupId: run.groupId,
        runs: [run],
        createdAt: run.createdAt,
        strategyName: run.strategyName,
        source: run.source
      });
    }

    return Array.from(groups.values(), (group) => ({
      ...group,
      runs: group.runs.toSorted((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filtered]);

  return (
    <div className="rounded-card border-border bg-surface shadow-card mt-6 border">
      <div className="border-border bg-surface-muted flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-body text-text-primary font-semibold">Select Runs</span>
          {leftId && (
            <Badge tone="info" variant="soft" size="sm">
              Left: {leftId.slice(0, 8)}...
              <button type="button" onClick={onClearLeft} className="hover:text-info-900 ml-0.5" aria-label="Clear left selection">
                &times;
              </button>
            </Badge>
          )}
          {rightId && (
            <Badge tone="info" variant="soft" size="sm">
              Right: {rightId.slice(0, 8)}...
              <button type="button" onClick={onClearRight} className="hover:text-info-900 ml-0.5" aria-label="Clear right selection">
                &times;
              </button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(leftId || rightId) && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        <FilterBar className="items-end">
          <div className="min-w-0 flex-1">
            <FilterSearch
              value={filters.filterText}
              onChange={(value) => {
                dispatchFilters({ type: "setFilterText", value });
              }}
              placeholder="Filter by strategy name, preset, source, or run ID..."
              width="w-full"
            />
          </div>
          <SegmentedControl
            options={SOURCE_FILTER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            value={filters.sourceFilter}
            onChange={(value) => {
              dispatchFilters({ type: "setSourceFilter", value });
            }}
            size="sm"
            label="Source filter"
          />
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-text-muted text-[10px] font-medium">From</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  dispatchFilters({ type: "setDateFrom", value: e.target.value });
                }}
                className="rounded-input border-border-strong bg-surface text-body focus:border-primary-500 focus:ring-primary-500 border px-2 py-1.5 focus:ring-1 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-text-muted text-[10px] font-medium">To</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  dispatchFilters({ type: "setDateTo", value: e.target.value });
                }}
                className="rounded-input border-border-strong bg-surface text-body focus:border-primary-500 focus:ring-primary-500 border px-2 py-1.5 focus:ring-1 focus:outline-none"
              />
            </label>
            {(filters.dateFrom || filters.dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  dispatchFilters({ type: "clearDates" });
                }}
                className="mb-0.5"
              >
                Clear dates
              </Button>
            )}
          </div>
        </FilterBar>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" className="text-text-disabled" />
          </div>
        ) : error ? (
          <p className="text-body text-danger-600 py-4 text-center">{error}</p>
        ) : (
          <>
            <p className="text-text-disabled mt-2 text-[11px]">
              Showing {filtered.length} of {total} runs
            </p>
            <div ref={scrollRef} className="mt-2 max-h-[28rem] space-y-1.5 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-body text-text-disabled py-4 text-center">{filters.filterText ? "No runs match your filter." : "No runs found."}</p>
              ) : (
                runGroups.map((group) => (
                  <RunGroupRow
                    key={group.id}
                    group={group}
                    isExpanded={expandedRuns[group.id] ?? false}
                    onToggleExpanded={() => {
                      setExpandedRuns((prev) => ({ ...prev, [group.id]: !(prev[group.id] ?? false) }));
                    }}
                    leftId={leftId}
                    rightId={rightId}
                    onToggleSelect={onToggle}
                  />
                ))
              )}
              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center py-3">
                  {loadingMore && <Spinner size="sm" className="text-text-disabled" />}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

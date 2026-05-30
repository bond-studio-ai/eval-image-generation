'use client';

import { CdnImage } from '@/components/cdn-image';
import { PageHeader } from '@/components/page-header';
import {
  Badge,
  Button,
  CheckCircleIcon,
  cn,
  FilterBar,
  FilterSearch,
  SegmentedControl,
  Spinner,
} from '@/components/ui';
import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CompareView } from './compare-view';
import { SingleRunAuditView } from './single-run-audit-view';

interface RunListItem {
  id: string;
  batchRunId: string | null;
  groupId: string | null;
  strategyId: string;
  strategyName: string | null;
  status: string;
  createdAt: string;
  source: string | null;
  inputPresetName: string | null;
  lastOutputUrl: string | null;
  judgeScore: number | null;
}

const SOURCE_LABELS: Record<string, string> = {
  preset: 'Preset',
  raw_input: 'Real Input',
  batch: 'Batch',
  retry: 'Preset',
};

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All runs' },
  { value: 'preset', label: 'Preset runs' },
  { value: 'raw_input', label: 'Real Input runs' },
] as const;

type SourceFilter = (typeof SOURCE_FILTER_OPTIONS)[number]['value'];
type AuditRunGroup = {
  id: string;
  batchRunId: string | null;
  groupId: string | null;
  runs: RunListItem[];
  createdAt: string;
  strategyName: string | null;
  source: string | null;
};

const THUMB = 48;
const PAGE_SIZE = 50;

function RunPickerCard({
  run,
  isSelected,
  onSelect,
}: {
  run: RunListItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusTone =
    run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'neutral';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-card flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors',
        isSelected
          ? 'border-primary-400 bg-primary-50 ring-primary-400 ring-1'
          : 'border-border bg-surface hover:bg-surface-muted',
      )}
    >
      <div className="shrink-0">
        {run.lastOutputUrl ? (
          <CdnImage
            src={run.lastOutputUrl}
            alt=""
            width={THUMB}
            height={THUMB}
            className="border-border rounded border object-cover"
            style={{ width: THUMB, height: THUMB }}
          />
        ) : (
          <span
            className="border-border bg-surface-muted text-text-disabled inline-flex items-center justify-center rounded border text-[10px]"
            style={{ width: THUMB, height: THUMB }}
          >
            --
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body text-text-primary truncate font-medium">
          {run.strategyName ?? 'Unknown strategy'}
        </p>
        <p className="text-text-muted truncate text-[11px]">
          {run.inputPresetName ?? 'No preset'} &middot; {new Date(run.createdAt).toLocaleString()}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          <Badge tone={statusTone} variant="soft" size="sm">
            {run.status}
          </Badge>
          {run.source && (
            <Badge tone="info" variant="soft" size="sm">
              {SOURCE_LABELS[run.source] ?? run.source}
            </Badge>
          )}
          {run.judgeScore != null && (
            <Badge tone="accent" variant="soft" size="sm">
              J:{run.judgeScore}
            </Badge>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {isSelected ? (
          <CheckCircleIcon className="text-primary-600 size-5" aria-hidden="true" />
        ) : (
          <span
            className="border-border-strong inline-flex size-5 items-center justify-center rounded-full border-2"
            aria-hidden="true"
          />
        )}
      </div>
    </button>
  );
}

function toIsoStart(date: string): string {
  return new Date(date + 'T00:00:00Z').toISOString();
}

function toIsoEnd(date: string): string {
  return new Date(date + 'T23:59:59.999Z').toISOString();
}

type FiltersState = {
  filterText: string;
  dateFrom: string;
  dateTo: string;
  sourceFilter: SourceFilter;
};

type FiltersAction =
  | { type: 'setFilterText'; value: string }
  | { type: 'setDateFrom'; value: string }
  | { type: 'setDateTo'; value: string }
  | { type: 'setSourceFilter'; value: SourceFilter }
  | { type: 'clearDates' };

const INITIAL_FILTERS: FiltersState = {
  filterText: '',
  dateFrom: '',
  dateTo: '',
  sourceFilter: 'all',
};

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'setFilterText':
      return { ...state, filterText: action.value };
    case 'setDateFrom':
      return { ...state, dateFrom: action.value };
    case 'setDateTo':
      return { ...state, dateTo: action.value };
    case 'setSourceFilter':
      return { ...state, sourceFilter: action.value };
    case 'clearDates':
      return { ...state, dateFrom: '', dateTo: '' };
  }
}

export function AuditComparePage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
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
          individual_only: 'false',
        });
        if (filters.dateFrom) params.set('from', toIsoStart(filters.dateFrom));
        if (filters.dateTo) params.set('to', toIsoEnd(filters.dateTo));

        const res = await fetch(serviceUrl(`strategy-runs?${params}`), {
          cache: 'no-store',
        });
        if (!res.ok) {
          setError(`Failed to load runs (${res.status})`);
          return;
        }
        const json = await res.json();
        const data = (json.data ?? []) as RunListItem[];
        const paginationTotal = Number(json.pagination?.total ?? 0);

        if (replace) {
          setRuns(data);
          setTotal(paginationTotal);
          setPage(1);
        } else {
          setRuns((prev) => [...prev, ...data]);
          setTotal(paginationTotal);
          setPage(pageToFetch);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters.dateFrom, filters.dateTo],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchRuns({ replace: false, pageToFetch: page + 1 });
  }, [hasMore, loadingMore, page, fetchRuns]);

  useEffect(() => {
    setLoading(true);
    fetchRuns({ replace: true });
  }, [fetchRuns]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: '200px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const toggle = (id: string) => {
    if (leftId === id) {
      setLeftId(null);
    } else if (rightId === id) {
      setRightId(null);
    } else if (!leftId) {
      setLeftId(id);
    } else if (!rightId) {
      setRightId(id);
    } else {
      setRightId(id);
    }
  };

  const filteredByText = filters.filterText
    ? runs.filter((r) => {
        const t = filters.filterText.toLowerCase();
        return (
          r.id.toLowerCase().includes(t) ||
          (r.strategyName ?? '').toLowerCase().includes(t) ||
          (r.inputPresetName ?? '').toLowerCase().includes(t) ||
          (r.source ?? '').toLowerCase().includes(t)
        );
      })
    : runs;
  const filtered = filteredByText.filter((run) =>
    filters.sourceFilter === 'all'
      ? true
      : filters.sourceFilter === 'preset'
        ? run.source === 'preset' || !!run.inputPresetName
        : run.source === 'raw_input',
  );
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
        source: run.source,
      });
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        runs: group.runs.toSorted(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filtered]);

  const canCompare = leftId && rightId;

  return (
    <div>
      <PageHeader
        title="Audit"
        subtitle="Select one run to inspect its audit data, or two runs to compare side by side."
      />

      {/* Picker section */}
      <div className="rounded-card border-border bg-surface shadow-card mt-6 border">
        <div className="border-border bg-surface-muted flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-body text-text-primary font-semibold">Select Runs</span>
            {leftId && (
              <Badge tone="info" variant="soft" size="sm">
                Left: {leftId.slice(0, 8)}...
                <button
                  type="button"
                  onClick={() => setLeftId(null)}
                  className="hover:text-info-900 ml-0.5"
                  aria-label="Clear left selection"
                >
                  &times;
                </button>
              </Badge>
            )}
            {rightId && (
              <Badge tone="info" variant="soft" size="sm">
                Right: {rightId.slice(0, 8)}...
                <button
                  type="button"
                  onClick={() => setRightId(null)}
                  className="hover:text-info-900 ml-0.5"
                  aria-label="Clear right selection"
                >
                  &times;
                </button>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(leftId || rightId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLeftId(null);
                  setRightId(null);
                }}
              >
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
                onChange={(value) => dispatchFilters({ type: 'setFilterText', value })}
                placeholder="Filter by strategy name, preset, source, or run ID..."
                width="w-full"
              />
            </div>
            <SegmentedControl
              options={SOURCE_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={filters.sourceFilter}
              onChange={(v) => dispatchFilters({ type: 'setSourceFilter', value: v })}
              size="sm"
              label="Source filter"
            />
            <div className="flex items-end gap-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-text-muted text-[10px] font-medium">From</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => dispatchFilters({ type: 'setDateFrom', value: e.target.value })}
                  className="rounded-input border-border-strong bg-surface text-body focus:border-primary-500 focus:ring-primary-500 border px-2 py-1.5 focus:ring-1 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-text-muted text-[10px] font-medium">To</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => dispatchFilters({ type: 'setDateTo', value: e.target.value })}
                  className="rounded-input border-border-strong bg-surface text-body focus:border-primary-500 focus:ring-primary-500 border px-2 py-1.5 focus:ring-1 focus:outline-none"
                />
              </label>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatchFilters({ type: 'clearDates' })}
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
                  <p className="text-body text-text-disabled py-4 text-center">
                    {filters.filterText ? 'No runs match your filter.' : 'No runs found.'}
                  </p>
                ) : (
                  runGroups.map((group) => {
                    const isExpanded = expandedRuns[group.id] ?? false;
                    return (
                      <div
                        key={group.id}
                        className="rounded-card border-border bg-surface-muted/40 border"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRuns((prev) => ({
                              ...prev,
                              [group.id]: !isExpanded,
                            }))
                          }
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="text-caption text-text-secondary block truncate font-semibold tracking-wide uppercase">
                              {group.groupId || group.batchRunId
                                ? `Group ${group.id.slice(0, 8)}`
                                : `Run ${group.id.slice(0, 8)}`}
                            </span>
                            <span className="text-caption text-text-muted mt-0.5 block truncate">
                              {group.strategyName ?? 'Unknown strategy'} ·{' '}
                              {new Date(group.createdAt).toLocaleString()}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge tone="neutral" variant="outline" size="sm">
                              {group.runs.length} run{group.runs.length === 1 ? '' : 's'}
                            </Badge>
                            {group.source ? (
                              <Badge tone="info" variant="outline" size="sm">
                                {SOURCE_LABELS[group.source] ?? group.source}
                              </Badge>
                            ) : null}
                            <svg
                              className={cn(
                                'text-text-disabled h-4 w-4 transition-transform',
                                isExpanded && 'rotate-180',
                              )}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m19.5 8.25-7.5 7.5-7.5-7.5"
                              />
                            </svg>
                          </span>
                        </button>
                        {isExpanded ? (
                          <div className="border-border bg-surface space-y-1.5 border-t p-2">
                            {group.runs.map((run) => (
                              <RunPickerCard
                                key={run.id}
                                run={run}
                                isSelected={run.id === leftId || run.id === rightId}
                                onSelect={() => toggle(run.id)}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
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

      {/* Results */}
      {canCompare && (
        <div className="mt-8">
          <CompareView leftId={leftId} rightId={rightId} />
        </div>
      )}

      {!canCompare && (leftId || rightId) && (
        <div className="mt-8">
          <SingleRunAuditView runId={(leftId ?? rightId)!} />
        </div>
      )}
    </div>
  );
}

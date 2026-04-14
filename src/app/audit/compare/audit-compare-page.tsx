'use client';

import { PageHeader } from '@/components/page-header';
import { serviceUrl } from '@/lib/api-base';
import { withImageParams } from '@/lib/image-utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
        isSelected
          ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-400'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="shrink-0">
        {run.lastOutputUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withImageParams(run.lastOutputUrl, 96)}
            alt=""
            width={THUMB}
            height={THUMB}
            className="rounded border border-gray-200 object-cover"
            style={{ width: THUMB, height: THUMB }}
            loading="lazy"
          />
        ) : (
          <span
            className="inline-flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-400"
            style={{ width: THUMB, height: THUMB }}
          >
            --
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {run.strategyName ?? 'Unknown strategy'}
        </p>
        <p className="truncate text-[11px] text-gray-500">
          {run.inputPresetName ?? 'No preset'} &middot;{' '}
          {new Date(run.createdAt).toLocaleString()}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          <span
            className={`inline-flex rounded-full px-1.5 py-0 text-[10px] font-medium ${
              run.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : run.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {run.status}
          </span>
          {run.source && (
            <span className="inline-flex rounded-full bg-blue-100 px-1.5 py-0 text-[10px] font-medium text-blue-700">
              {SOURCE_LABELS[run.source] ?? run.source}
            </span>
          )}
          {run.judgeScore != null && (
            <span className="inline-flex rounded-full bg-indigo-100 px-1.5 py-0 text-[10px] font-medium text-indigo-700">
              J:{run.judgeScore}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {isSelected ? (
          <svg className="h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-300" />
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

export function AuditComparePage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
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
        if (dateFrom) params.set('from', toIsoStart(dateFrom));
        if (dateTo) params.set('to', toIsoEnd(dateTo));

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
    [dateFrom, dateTo],
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

  const filteredByText = filterText
    ? runs.filter((r) => {
        const t = filterText.toLowerCase();
        return (
          r.id.toLowerCase().includes(t) ||
          (r.strategyName ?? '').toLowerCase().includes(t) ||
          (r.inputPresetName ?? '').toLowerCase().includes(t) ||
          (r.source ?? '').toLowerCase().includes(t)
        );
      })
    : runs;
  const filtered = filteredByText.filter((run) =>
    sourceFilter === 'all'
      ? true
      : sourceFilter === 'preset'
        ? run.source === 'preset' || !!run.inputPresetName
        : run.source === 'raw_input'
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
        runs: [...group.runs].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
      <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">Select Runs</span>
            {leftId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                Left: {leftId.slice(0, 8)}...
                <button type="button" onClick={() => setLeftId(null)} className="ml-0.5 hover:text-primary-900">&times;</button>
              </span>
            )}
            {rightId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                Right: {rightId.slice(0, 8)}...
                <button type="button" onClick={() => setRightId(null)} className="ml-0.5 hover:text-primary-900">&times;</button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(leftId || rightId) && (
              <button
                type="button"
                onClick={() => { setLeftId(null); setRightId(null); }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter by strategy name, preset, source, or run ID..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1">
              {SOURCE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceFilter(option.value)}
                  className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    sourceFilter === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-gray-500">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-gray-500">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="mt-3.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-600">{error}</p>
          ) : (
            <>
              <p className="mt-2 text-[11px] text-gray-400">
                Showing {filtered.length} of {total} runs
              </p>
              <div ref={scrollRef} className="mt-2 max-h-[28rem] space-y-1.5 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">
                    {filterText ? 'No runs match your filter.' : 'No runs found.'}
                  </p>
                ) : (
                  runGroups.map((group) => {
                    const isExpanded = expandedRuns[group.id] ?? false;
                    return (
                      <div key={group.id} className="rounded-lg border border-gray-200 bg-gray-50/40">
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
                            <span className="block truncate text-xs font-semibold uppercase tracking-wide text-gray-600">
                              {group.groupId || group.batchRunId
                                ? `Group ${group.id.slice(0, 8)}`
                                : `Run ${group.id.slice(0, 8)}`}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-gray-500">
                              {group.strategyName ?? 'Unknown strategy'} · {new Date(group.createdAt).toLocaleString()}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-200">
                              {group.runs.length} run{group.runs.length === 1 ? '' : 's'}
                            </span>
                            {group.source ? (
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                                {SOURCE_LABELS[group.source] ?? group.source}
                              </span>
                            ) : null}
                            <svg
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </span>
                        </button>
                        {isExpanded ? (
                          <div className="space-y-1.5 border-t border-gray-200 bg-white p-2">
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
                    {loadingMore && (
                      <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
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

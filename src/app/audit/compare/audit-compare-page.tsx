'use client';

import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useState } from 'react';
import { CompareView } from './compare-view';

interface RunListItem {
  id: string;
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
  raw_input: 'API',
  batch: 'Batch',
  retry: 'Retry',
};

const THUMB = 48;

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
            src={run.lastOutputUrl}
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

export function AuditComparePage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(
        serviceUrl('strategy-runs?limit=200&individual_only=false'),
        { cache: 'no-store' },
      );
      if (!res.ok) {
        setError(`Failed to load runs (${res.status})`);
        return;
      }
      const json = await res.json();
      setRuns((json.data ?? []) as RunListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

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

  const filtered = filterText
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

  const canCompare = leftId && rightId;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Audit Compare</h1>
      <p className="mt-1 text-sm text-gray-500">
        Select two runs to compare their full audit data side by side.
      </p>

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
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by strategy name, preset, source, or run ID..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />

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
            <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  {filterText ? 'No runs match your filter.' : 'No runs found.'}
                </p>
              ) : (
                filtered.map((run) => (
                  <RunPickerCard
                    key={run.id}
                    run={run}
                    isSelected={run.id === leftId || run.id === rightId}
                    onSelect={() => toggle(run.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison results */}
      {canCompare && (
        <div className="mt-8">
          <CompareView leftId={leftId} rightId={rightId} />
        </div>
      )}

      {!canCompare && (leftId || rightId) && (
        <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-12 text-sm text-gray-500">
          Select one more run to start comparing.
        </div>
      )}
    </div>
  );
}

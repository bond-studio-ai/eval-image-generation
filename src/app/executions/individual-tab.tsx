'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface RunRow {
  id: string;
  strategyId: string;
  strategyName: string | null;
  status: string;
  createdAt: string;
  inputPresetName: string | null;
  lastOutputUrl: string | null;
}

const POLL_INTERVAL = 5000;
const CELL = 160;
const IMG = CELL - 20;

export function IndividualExecutionsTab() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [presetFilter, setPresetFilter] = useState<Set<string> | null>(null);
  const [strategyFilter, setStrategyFilter] = useState<Set<string> | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/strategy-runs?limit=200', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setRuns(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const hasActive = runs.some((r) => r.status === 'running' || r.status === 'pending');
  useEffect(() => {
    if (hasActive) {
      intervalRef.current = setInterval(fetchRuns, POLL_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hasActive, fetchRuns]);

  const allPresets = useMemo(() => {
    const s = new Set<string>();
    for (const r of runs) if (r.inputPresetName) s.add(r.inputPresetName);
    return Array.from(s).sort();
  }, [runs]);

  const allStrategies = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of runs) if (r.strategyId && r.strategyName) map.set(r.strategyId, r.strategyName);
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [runs]);

  // Auto-select all on first load
  useEffect(() => {
    if (presetFilter === null && allPresets.length > 0) {
      setPresetFilter(new Set(allPresets));
    }
  }, [allPresets, presetFilter]);

  useEffect(() => {
    if (strategyFilter === null && allStrategies.length > 0) {
      setStrategyFilter(new Set(allStrategies.map((s) => s.id)));
    }
  }, [allStrategies, strategyFilter]);

  const activePresets = presetFilter ?? new Set(allPresets);
  const activeStrategies = strategyFilter ?? new Set(allStrategies.map((s) => s.id));

  const togglePreset = useCallback((name: string) => {
    setPresetFilter((prev) => {
      const base = prev ?? new Set(allPresets);
      const next = new Set(base);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, [allPresets]);

  const toggleStrategy = useCallback((id: string) => {
    setStrategyFilter((prev) => {
      const base = prev ?? new Set(allStrategies.map((s) => s.id));
      const next = new Set(base);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [allStrategies]);

  const matrix = useMemo(() => {
    const visiblePresets = allPresets.filter((p) => activePresets.has(p));
    const visibleStrategies = allStrategies.filter((s) => activeStrategies.has(s.id));

    const filteredRuns = runs.filter((r) => {
      if (!r.inputPresetName || !activePresets.has(r.inputPresetName)) return false;
      if (!activeStrategies.has(r.strategyId)) return false;
      return true;
    });

    const latest = new Map<string, RunRow>();
    for (const r of filteredRuns) {
      if (!r.inputPresetName) continue;
      const key = `${r.inputPresetName}|${r.strategyId}`;
      const existing = latest.get(key);
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
        latest.set(key, r);
      }
    }

    return { presets: visiblePresets, strategies: visibleStrategies, latest };
  }, [runs, activePresets, activeStrategies, allPresets, allStrategies]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading executions…</p>;
  }

  if (runs.length === 0) {
    return <p className="text-sm text-gray-600">No individual runs yet. Run a strategy from its detail page.</p>;
  }

  const cols = matrix.strategies.length;

  return (
    <div className="space-y-5">
      {/* Filter panels */}
      <div className="grid grid-cols-2 gap-4">
        <FilterPanel
          label="Input Presets"
          items={allPresets.map((p) => ({ id: p, name: p }))}
          selected={activePresets}
          onToggle={togglePreset}
          onClear={() => setPresetFilter(new Set())}
          onSelectAll={() => setPresetFilter(new Set(allPresets))}
        />
        <FilterPanel
          label="Strategies"
          items={allStrategies}
          selected={activeStrategies}
          onToggle={toggleStrategy}
          onClear={() => setStrategyFilter(new Set())}
          onSelectAll={() => setStrategyFilter(new Set(allStrategies.map((s) => s.id)))}
        />
      </div>

      {/* Grid */}
      {matrix.presets.length === 0 || matrix.strategies.length === 0 ? (
        <p className="text-sm text-gray-500">Select presets and strategies above to see the matrix.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-xs">
          {/* Header row */}
          <div
            className="grid border-b border-gray-200 bg-gray-50"
            style={{ gridTemplateColumns: `220px repeat(${cols}, ${CELL}px)` }}
          >
            <div className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Input Preset
            </div>
            {matrix.strategies.map((s) => (
              <div key={s.id} className="flex items-center justify-center px-2 py-3 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 line-clamp-2">
                  {s.name}
                </span>
              </div>
            ))}
          </div>

          {/* Body rows */}
          {matrix.presets.map((presetName, rowIdx) => (
            <div
              key={presetName}
              className={`grid hover:bg-gray-50/60 ${rowIdx > 0 ? 'border-t border-gray-100' : ''}`}
              style={{ gridTemplateColumns: `220px repeat(${cols}, ${CELL}px)` }}
            >
              <div className="sticky left-0 z-10 flex items-center border-r border-gray-200 bg-white px-4">
                <span className="block max-w-[200px] truncate text-sm font-medium text-gray-900" title={presetName}>
                  {presetName}
                </span>
              </div>
              {matrix.strategies.map((s) => {
                const run = matrix.latest.get(`${presetName}|${s.id}`);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-center border-l border-gray-50 p-2"
                    style={{ width: CELL, height: CELL }}
                  >
                    {run ? (
                      run.lastOutputUrl ? (
                        <Link href={`/strategies/${run.strategyId}/runs/${run.id}`} className="block">
                          <img
                            src={run.lastOutputUrl}
                            alt=""
                            className="rounded-lg border border-gray-200 object-cover shadow-sm transition-shadow hover:shadow-md"
                            style={{ width: IMG, height: IMG }}
                          />
                        </Link>
                      ) : (
                        <Link href={`/strategies/${run.strategyId}/runs/${run.id}`}>
                          <StatusBadge status={run.status} />
                        </Link>
                      )
                    ) : (
                      <span className="text-gray-200">&mdash;</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Filter Panel ─── */

function FilterPanel({
  label,
  items,
  selected,
  onToggle,
  onClear,
  onSelectAll,
}: {
  label: string;
  items: { id: string; name: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  onSelectAll: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-gray-400">
            {selected.size}/{items.length}
          </span>
          <button type="button" onClick={onSelectAll}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-primary-600 hover:bg-primary-50">
            All
          </button>
          <button type="button" onClick={onClear}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100">
            None
          </button>
        </div>
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <svg className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded-md border border-gray-200 py-1 pl-7 pr-2 text-xs focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="max-h-44 overflow-y-auto px-2 py-1.5">
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-xs text-gray-400">No matches</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((item) => {
              const on = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    on
                      ? 'border-primary-400 bg-primary-50 text-primary-800 shadow-sm'
                      : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

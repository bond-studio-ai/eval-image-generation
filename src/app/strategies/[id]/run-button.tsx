'use client';

import type { InputPresetListItem } from '@/lib/queries';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/* ────────────────── Simple Run (single preset, single run) ────────────────── */

export function StrategyRunButton({
  strategyId,
  inputPresets,
  onRunCreated,
}: {
  strategyId: string;
  inputPresets: InputPresetListItem[];
  onRunCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredPresets = useMemo(() => {
    const q = search.toLowerCase().trim();
    return inputPresets.filter((p) => (p.name ?? '').toLowerCase().includes(q));
  }, [inputPresets, search]);

  const handleStart = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_preset_ids: [selectedId] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || 'Failed'); return; }
      setShowModal(false);
      setSelectedId(null);
      setSearch('');
      onRunCreated?.();
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  }, [strategyId, selectedId, onRunCreated]);

  return (
    <>
      <button
        onClick={() => { setShowModal(true); setError(null); }}
        className="bg-primary-600 hover:bg-primary-700 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
        </svg>
        Run
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4" onClick={() => { setShowModal(false); setError(null); setSearch(''); }}>
          <div
            className="flex w-full max-w-md flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
            style={{ height: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Run strategy</h3>
              <p className="mt-1 text-sm text-gray-600">Select an input preset for a single execution.</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 pt-3 pb-3">
              <div className="relative mb-3 shrink-0">
                <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..." autoFocus
                  className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredPresets.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">
                    {inputPresets.length === 0 ? 'No presets exist.' : 'No matches.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredPresets.map((p) => (
                      <button
                        key={p.id} type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selectedId === p.id ? 'bg-primary-50 ring-1 ring-primary-500' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate font-medium text-gray-900">{p.name || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="shrink-0 px-5 pb-2 text-sm text-red-600">{error}</p>}

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button type="button" onClick={() => { setShowModal(false); setError(null); setSearch(''); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={handleStart} disabled={submitting || !selectedId}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed">
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Starting...
                  </>
                ) : 'Start run'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ────────────────── Batch Run (multiple presets × N executions) ────────────── */

export function StrategyBatchRunButton({
  strategyId,
  inputPresets,
  onRunCreated,
}: {
  strategyId: string;
  inputPresets: InputPresetListItem[];
  onRunCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [executionCount, setExecutionCount] = useState(1);

  const presetMap = useMemo(
    () => new Map(inputPresets.map((p) => [p.id, p])),
    [inputPresets],
  );

  const filteredPresets = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const q = search.toLowerCase().trim();
    return inputPresets.filter(
      (p) => !selectedSet.has(p.id) && (p.name ?? '').toLowerCase().includes(q),
    );
  }, [inputPresets, selectedIds, search]);

  const addPreset = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removePreset = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const handleStartBatch = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    setError(null);

    const count = Math.max(1, Math.min(100, executionCount));
    const inputPresetIds = Array.from({ length: count }, () => selectedIds).flat();

    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_preset_ids: inputPresetIds, batch: true, execution_count: count }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || 'Failed to start batch'); return; }
      setShowModal(false);
      setSelectedIds([]);
      setSearch('');
      setExecutionCount(1);
      onRunCreated?.();
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  }, [strategyId, selectedIds, executionCount, onRunCreated]);

  const totalRuns = selectedIds.length * Math.max(1, Math.min(100, executionCount));

  return (
    <>
      <button
        onClick={() => { setShowModal(true); setError(null); }}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
        Run Batch
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4" onClick={() => { setShowModal(false); setError(null); setSearch(''); }}>
          <div
            className="flex w-full max-w-2xl flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
            style={{ height: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Run batch</h3>
              <p className="mt-1 text-sm text-gray-600">
                Select input presets and how many times to run each. Results are grouped as a batch.
              </p>
            </div>

            <div className="flex min-h-0 flex-1">
              {/* Left: available presets */}
              <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200">
                <div className="shrink-0 px-4 pt-3 pb-2">
                  <p className="mb-2 text-xs font-medium text-gray-500 uppercase">Available presets</p>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..." autoFocus
                      className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
                  {filteredPresets.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
                      {inputPresets.length === 0 ? 'No presets exist.' : search ? 'No matches.' : 'All presets added.'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredPresets.map((preset) => (
                        <button
                          key={preset.id} type="button"
                          onClick={() => addPreset(preset.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <svg className="h-4 w-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <span className="truncate font-medium text-gray-900">{preset.name || 'Untitled'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: selected presets */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 px-4 pt-3 pb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Selected ({selectedIds.length})</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
                  {selectedIds.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">Click presets on the left to add them</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedIds.map((id) => {
                        const preset = presetMap.get(id);
                        return (
                          <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <span className="truncate text-sm font-medium text-gray-900">{preset?.name || 'Untitled'}</span>
                            <button type="button" onClick={() => removePreset(id)}
                              className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="shrink-0 px-5 pb-2 text-sm text-red-600">{error}</p>}

            <div className="shrink-0 border-t border-gray-200 px-5 py-3">
              <label className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Executions per preset</span>
                <input
                  type="number" min={1} max={100} value={executionCount}
                  onChange={(e) => setExecutionCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">
                {selectedIds.length} preset(s) &times; {Math.max(1, Math.min(100, executionCount))} execution(s) = {totalRuns} total run(s).
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button type="button" onClick={() => { setShowModal(false); setError(null); setSearch(''); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={handleStartBatch} disabled={submitting || selectedIds.length === 0}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed">
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Starting...
                  </>
                ) : totalRuns === 0 ? 'Select presets' : `Start batch (${totalRuns} run${totalRuns === 1 ? '' : 's'})`}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

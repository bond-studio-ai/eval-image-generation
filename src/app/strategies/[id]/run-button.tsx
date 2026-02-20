'use client';

import type { InputPresetListItem } from '@/lib/queries';
import { useCallback, useMemo, useState } from 'react';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

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

  const handleStartRun = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_preset_ids: selectedIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Failed to run strategy');
        return;
      }

      setShowModal(false);
      setSelectedIds([]);
      setSearch('');
      onRunCreated?.();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [strategyId, selectedIds, onRunCreated]);

  return (
    <>
      <button
        onClick={() => { setShowModal(true); setError(null); }}
        className="bg-primary-600 hover:bg-primary-700 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
        </svg>
        Run Strategy
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowModal(false); setError(null); setSearch(''); }}>
          <div
            className="flex w-full max-w-2xl flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
            style={{ height: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Run strategy</h3>
              <p className="mt-1 text-sm text-gray-600">
                Select input presets. Each preset runs the full strategy independently in parallel.
              </p>
            </div>

            {/* Two-column body */}
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
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      autoFocus
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
                          key={preset.id}
                          type="button"
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
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Selected ({selectedIds.length})
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
                  {selectedIds.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">Click presets on the left to add them</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedIds.map((id) => {
                        const preset = presetMap.get(id);
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                          >
                            <span className="truncate text-sm font-medium text-gray-900">
                              {preset?.name || 'Untitled'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePreset(id)}
                              className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                            >
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

            {/* Error */}
            {error && <p className="shrink-0 px-5 pb-2 text-sm text-red-600">{error}</p>}

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); setError(null); setSearch(''); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRun}
                disabled={submitting || selectedIds.length === 0}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Starting...
                  </>
                ) : selectedIds.length === 0 ? (
                  'Select presets to run'
                ) : selectedIds.length === 1 ? (
                  'Start 1 run'
                ) : (
                  `Start ${selectedIds.length} runs`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

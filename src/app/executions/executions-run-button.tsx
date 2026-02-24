'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface StrategyItem {
  id: string;
  name: string;
}

interface PresetItem {
  id: string;
  name: string | null;
}

export function ExecutionsRunButton({ onRunCreated }: { onRunCreated?: () => void }) {
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [executionCount, setExecutionCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showModal) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch('/api/v1/strategies?limit=100').then((r) => r.json()),
      fetch('/api/v1/input-presets?limit=100').then((r) => r.json()),
    ])
      .then(([stratRes, presetRes]) => {
        if (cancelled) return;
        const stratData = stratRes.data ?? stratRes.items ?? [];
        const presetData = presetRes.data ?? presetRes.items ?? [];
        setStrategies(Array.isArray(stratData) ? stratData.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) : []);
        setPresets(Array.isArray(presetData) ? presetData.map((p: { id: string; name: string | null }) => ({ id: p.id, name: p.name ?? null })) : []);
      })
      .catch(() => { if (!cancelled) setStrategies([]); setPresets([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showModal]);

  const toggleStrategy = useCallback((id: string) => {
    setSelectedStrategyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const togglePreset = useCallback((id: string) => {
    setSelectedPresetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleRun = useCallback(async () => {
    if (selectedStrategyIds.length === 0 || selectedPresetIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    const count = Math.max(1, Math.min(100, executionCount));

    try {
      const res = await fetch('/api/v1/strategy-batch-runs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_ids: selectedStrategyIds,
          input_preset_ids: selectedPresetIds,
          execution_count: count,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Failed to start run');
        setSubmitting(false);
        return;
      }
      setShowModal(false);
      setSelectedStrategyIds([]);
      setSelectedPresetIds([]);
      setExecutionCount(1);
      onRunCreated?.();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [selectedStrategyIds, selectedPresetIds, executionCount, onRunCreated]);

  const totalRuns = selectedStrategyIds.length * selectedPresetIds.length * Math.max(1, Math.min(100, executionCount));

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowModal(true);
          setError(null);
          setSelectedStrategyIds([]);
          setSelectedPresetIds([]);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
        </svg>
        Run
      </button>

      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowModal(false);
              setError(null);
            }}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-gray-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Run</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Select strategies and input presets. This creates one batch: strategies × presets × images to generate.
                </p>
              </div>

              {loading ? (
                <div className="flex flex-1 items-center justify-center py-12 text-sm text-gray-500">
                  Loading…
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-auto p-4">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Strategies</p>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                      {strategies.length === 0 ? (
                        <p className="py-2 text-center text-xs text-gray-400">No strategies</p>
                      ) : (
                        strategies.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleStrategy(s.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${selectedStrategyIds.includes(s.id) ? 'bg-primary-50 ring-1 ring-primary-500' : 'hover:bg-gray-50'}`}
                          >
                            <span className="truncate font-medium text-gray-900">{s.name || 'Unnamed'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Input presets</p>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                      {presets.length === 0 ? (
                        <p className="py-2 text-center text-xs text-gray-400">No presets</p>
                      ) : (
                        presets.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePreset(p.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${selectedPresetIds.includes(p.id) ? 'bg-primary-50 ring-1 ring-primary-500' : 'hover:bg-gray-50'}`}
                          >
                            <span className="truncate font-medium text-gray-900">{p.name || 'Untitled'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="shrink-0 border-t border-gray-200 px-5 py-3">
                <label className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Images to generate (per preset)</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={executionCount}
                    onChange={(e) =>
                      setExecutionCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))
                    }
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedStrategyIds.length} strategy × {selectedPresetIds.length} preset × {Math.max(1, Math.min(100, executionCount))} image(s) = {totalRuns} total run(s) in one batch.
                </p>
              </div>

              {error && <p className="shrink-0 px-5 pb-2 text-sm text-red-600">{error}</p>}

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={submitting || selectedStrategyIds.length === 0 || selectedPresetIds.length === 0}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting…
                    </>
                  ) : (
                    'Run (1 batch)'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

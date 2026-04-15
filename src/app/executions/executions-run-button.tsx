'use client';

import { serviceUrl } from '@/lib/api-base';
import { fetchPresetRunRequests } from '@/lib/strategy-run-input';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface StrategyItem {
  id: string;
  name: string;
}

interface PresetItem {
  id: string;
  name: string | null;
}

const BENCHMARK_PROJECT_IDS = [
  'PRJ-P4YAGU7XW',
  'PRJ-QU6S58FHG',
  'PRJ-FARVFVS4A',
  'PRJ-T3HTSH5ME',
  'PRJ-E78TJ8WXM',
  'PRJ-K8X7ABKR2',
  'PRJ-QJUEYENEP',
  'PRJ-P8CD6Q2HH',
  'PRJ-QSNP6AZTC',
  'PRJ-BD38GQP2K',
  'PRJ-4XN53LRMM',
  'PRJ-VPG3BGK29',
  'PRJ-954NJBRZQ',
  'PRJ-887MW333R',
  'PRJ-3ASSMMB7A',
  'PRJ-9LGYQDNSY',
  'PRJ-TFJDZP3VK',
  'PRJ-KBLQ9SAU4',
  'PRJ-N43MK39ZR',
  'PRJ-XB6SETAU7',
] as const;

const DEFAULT_BENCHMARK_PROJECT_IDS = [...BENCHMARK_PROJECT_IDS];

export function ExecutionsRunButton({ onRunCreated }: { onRunCreated?: () => void }) {
  const searchParams = useSearchParams();
  const source = searchParams.get('source') === 'benchmark' ? 'benchmark' : 'default';
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [selectedBenchmarkProjectIds, setSelectedBenchmarkProjectIds] = useState<string[]>([]);
  const [strategySearch, setStrategySearch] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const [benchmarkMode, setBenchmarkMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberOfImages, setNumberOfImages] = useState<number | null>(null);

  const filteredStrategies = useMemo(() => {
    const q = strategySearch.toLowerCase().trim();
    if (!q) return strategies;
    return strategies.filter((s) => s.name.toLowerCase().includes(q));
  }, [strategies, strategySearch]);

  const filteredPresets = useMemo(() => {
    const q = presetSearch.toLowerCase().trim();
    if (!q) return presets;
    return presets.filter((p) => (p.name ?? '').toLowerCase().includes(q));
  }, [presets, presetSearch]);

  const filteredBenchmarkProjects = useMemo(() => {
    const q = presetSearch.toLowerCase().trim();
    if (!q) return [...BENCHMARK_PROJECT_IDS];
    return BENCHMARK_PROJECT_IDS.filter((projectId) => projectId.toLowerCase().includes(q));
  }, [presetSearch]);

  useEffect(() => {
    if (!showModal) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(serviceUrl('strategies?limit=100'), { cache: 'no-store' }).then((r) => r.json()),
      fetch(serviceUrl('input-presets?limit=100&minimal=true'), { cache: 'no-store' }).then((r) => r.json()),
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

  const toggleBenchmarkProject = useCallback((id: string) => {
    setSelectedBenchmarkProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleRun = useCallback(async () => {
    if (selectedStrategyIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    const groupId = crypto.randomUUID();

    try {
      const results = benchmarkMode
        ? await Promise.allSettled(
          selectedStrategyIds.flatMap((strategyId) =>
            selectedBenchmarkProjectIds.map(async (projectId) => {
              const res = await fetch(serviceUrl(`strategies/${strategyId}/runs`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  project_id: projectId,
                  group_id: groupId,
                  ...(numberOfImages ? { number_of_images: numberOfImages } : {}),
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error(
                  (data as { error?: { message?: string } }).error?.message || 'Failed to start benchmark run',
                );
              }
              return data;
            }),
          ),
        )
        : await (async () => {
          const requests = await fetchPresetRunRequests(selectedPresetIds, {
            batch: true,
            group_id: groupId,
            ...(numberOfImages ? { number_of_images: numberOfImages } : {}),
          });
          return Promise.allSettled(
            selectedStrategyIds.flatMap((strategyId) =>
              requests.map(async (requestBody) => {
                const res = await fetch(serviceUrl(`strategies/${strategyId}/runs`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  throw new Error(
                    (data as { error?: { message?: string } }).error?.message || 'Failed to start run',
                  );
                }
                return data;
              }),
            ),
          );
        })();
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      if (failures.length > 0) {
        const succeeded = results.length - failures.length;
        setError(
          `${failures[0]?.reason instanceof Error ? failures[0].reason.message : 'Failed to start run'}${succeeded > 0 ? ' Some runs were still created.' : ''
          }`,
        );
        if (succeeded > 0) onRunCreated?.();
        setSubmitting(false);
        return;
      }
      setShowModal(false);
      setSelectedStrategyIds([]);
      setSelectedPresetIds([]);
      setSelectedBenchmarkProjectIds([]);
      setStrategySearch('');
      setPresetSearch('');
      setBenchmarkMode(source === 'benchmark');
      onRunCreated?.();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [benchmarkMode, selectedBenchmarkProjectIds, selectedPresetIds, selectedStrategyIds, onRunCreated, source]);

  const totalCombinations = benchmarkMode
    ? selectedStrategyIds.length * selectedBenchmarkProjectIds.length
    : selectedStrategyIds.length * selectedPresetIds.length;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowModal(true);
          setError(null);
          setSelectedStrategyIds([]);
          setSelectedPresetIds([]);
          setSelectedBenchmarkProjectIds(
            source === 'benchmark' ? DEFAULT_BENCHMARK_PROJECT_IDS : [],
          );
          setBenchmarkMode(source === 'benchmark');
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
              className="flex w-full max-w-3xl flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
              style={{ height: 'min(80vh, 640px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-gray-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-gray-900">New Run</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {benchmarkMode
                    ? 'Select strategies and benchmark project IDs. This creates benchmark runs for the selected strategies.'
                    : 'Select strategies and input presets. This creates one batch: strategies × presets × images to generate.'}
                </p>
                <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={benchmarkMode}
                    onChange={(e) => {
                      setBenchmarkMode(e.target.checked);
                      setSelectedPresetIds([]);
                      setSelectedBenchmarkProjectIds(
                        e.target.checked ? DEFAULT_BENCHMARK_PROJECT_IDS : [],
                      );
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Use benchmark projects
                </label>
              </div>

              {loading ? (
                <div className="flex flex-1 items-center justify-center py-12 text-sm text-gray-500">
                  Loading…
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-gray-200 overflow-hidden">
                  {/* Strategies */}
                  <div className="flex min-h-0 flex-col">
                    <div className="shrink-0 border-b border-gray-100 bg-gray-50/50 px-4 pt-3 pb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Strategies
                          {selectedStrategyIds.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                              {selectedStrategyIds.length}
                            </span>
                          )}
                        </p>
                        {selectedStrategyIds.length > 0 && (
                          <button type="button" onClick={() => setSelectedStrategyIds([])} className="text-[10px] font-medium text-gray-400 hover:text-gray-600">
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="relative mt-2">
                        <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                          type="text"
                          value={strategySearch}
                          onChange={(e) => setStrategySearch(e.target.value)}
                          placeholder="Search strategies…"
                          className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      {filteredStrategies.length === 0 ? (
                        <p className="py-4 text-center text-xs text-gray-400">
                          {strategies.length === 0 ? 'No strategies available' : 'No matches'}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {filteredStrategies.map((s) => {
                            const selected = selectedStrategyIds.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleStrategy(s.id)}
                                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${selected
                                    ? 'border-primary-400 bg-primary-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                              >
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${selected
                                    ? 'border-primary-500 bg-primary-500 text-white'
                                    : 'border-gray-300 bg-white'
                                  }`}>
                                  {selected && (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </span>
                                <span className="truncate font-medium text-gray-900">{s.name || 'Unnamed'}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input presets / benchmark projects */}
                  <div className="flex min-h-0 flex-col">
                    <div className="shrink-0 border-b border-gray-100 bg-gray-50/50 px-4 pt-3 pb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                          {benchmarkMode ? 'Benchmark projects' : 'Input presets'}
                          {(benchmarkMode ? selectedBenchmarkProjectIds.length : selectedPresetIds.length) > 0 && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                              {benchmarkMode ? selectedBenchmarkProjectIds.length : selectedPresetIds.length}
                            </span>
                          )}
                        </p>
                        {(benchmarkMode ? selectedBenchmarkProjectIds.length : selectedPresetIds.length) > 0 && (
                          <button type="button" onClick={() => benchmarkMode ? setSelectedBenchmarkProjectIds([]) : setSelectedPresetIds([])} className="text-[10px] font-medium text-gray-400 hover:text-gray-600">
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="relative mt-2">
                        <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                          type="text"
                          value={presetSearch}
                          onChange={(e) => setPresetSearch(e.target.value)}
                          placeholder={benchmarkMode ? 'Search project IDs…' : 'Search presets…'}
                          className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      {(benchmarkMode ? filteredBenchmarkProjects.length : filteredPresets.length) === 0 ? (
                        <p className="py-4 text-center text-xs text-gray-400">
                          {benchmarkMode ? 'No matches' : presets.length === 0 ? 'No presets available' : 'No matches'}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {(benchmarkMode ? filteredBenchmarkProjects : filteredPresets).map((entry) => {
                            const id = typeof entry === 'string' ? entry : entry.id;
                            const label = typeof entry === 'string' ? entry : entry.name || 'Untitled';
                            const selected = benchmarkMode ? selectedBenchmarkProjectIds.includes(id) : selectedPresetIds.includes(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => benchmarkMode ? toggleBenchmarkProject(id) : togglePreset(id)}
                                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${selected
                                    ? 'border-primary-400 bg-primary-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                              >
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${selected
                                    ? 'border-primary-500 bg-primary-500 text-white'
                                    : 'border-gray-300 bg-white'
                                  }`}>
                                  {selected && (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </span>
                                <span className="truncate font-medium text-gray-900">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-500">
                    {benchmarkMode ? (
                      <>
                        {selectedStrategyIds.length} {selectedStrategyIds.length === 1 ? 'strategy' : 'strategies'} &times; {selectedBenchmarkProjectIds.length} {selectedBenchmarkProjectIds.length === 1 ? 'project' : 'projects'} = <span className="font-semibold text-gray-700">{totalCombinations} batch{totalCombinations === 1 ? '' : 'es'}</span>
                      </>
                    ) : (
                      <>
                        {selectedStrategyIds.length} {selectedStrategyIds.length === 1 ? 'strategy' : 'strategies'} &times; {selectedPresetIds.length} {selectedPresetIds.length === 1 ? 'preset' : 'presets'} = <span className="font-semibold text-gray-700">{totalCombinations} batch{totalCombinations === 1 ? '' : 'es'}</span>
                      </>
                    )}
                  </p>
                  <NumberOfImagesInput value={numberOfImages} onChange={setNumberOfImages} />
                </div>
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
                  disabled={submitting || selectedStrategyIds.length === 0 || (benchmarkMode ? selectedBenchmarkProjectIds.length === 0 : selectedPresetIds.length === 0)}
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
                    benchmarkMode ? 'Run benchmarks' : 'Run (1 batch)'
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

function NumberOfImagesInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const isDefault = value === null;
  const isPreset = !isDefault && [1, 2, 4, 8].includes(value);
  const [customImages, setCustomImages] = useState(!isDefault && !isPreset);

  const activeCls = 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm';
  const inactiveCls = 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Images per judge</span>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { onChange(null); setCustomImages(false); }}
          className={`flex h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-all ${isDefault ? activeCls : inactiveCls}`}
        >
          Default
        </button>
        {[1, 2, 4, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => { onChange(n); setCustomImages(false); }}
            className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-all ${!isDefault && !customImages && value === n ? activeCls : inactiveCls}`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setCustomImages(true); if (isDefault || [1, 2, 4, 8].includes(value!)) onChange(3); }}
          className={`flex h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-all ${customImages ? activeCls : inactiveCls}`}
        >
          Custom
        </button>
        {customImages && (
          <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => onChange(Math.max(1, (value ?? 1) - 1))}
              disabled={(value ?? 1) <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-l-lg border-r border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <input
              type="number"
              min={1}
              max={100}
              autoFocus
              value={value ?? 1}
              onChange={(e) => onChange(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
              className="h-8 w-12 border-none bg-transparent text-center text-sm font-semibold text-gray-900 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onChange(Math.min(100, (value ?? 1) + 1))}
              disabled={(value ?? 1) >= 100}
              className="flex h-8 w-8 items-center justify-center rounded-r-lg border-l border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

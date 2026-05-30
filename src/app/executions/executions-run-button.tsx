'use client';

import { Modal } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useReducer, useState } from 'react';
import { MultiSelectColumn } from './_components/multi-select-column';
import { NumberOfImagesInput } from './_components/number-of-images-input';
import {
  BENCHMARK_PROJECT_IDS,
  DEFAULT_BENCHMARK_PROJECT_IDS,
  executeRuns,
  fetchRunOptions,
} from './_components/run-options';
import { INITIAL_SELECTION, selectionReducer } from './_components/selection-state';

export function ExecutionsRunButton(props: { onRunCreated?: () => void }) {
  return (
    <Suspense fallback={null}>
      <ExecutionsRunButtonInner {...props} />
    </Suspense>
  );
}

function ExecutionsRunButtonInner({ onRunCreated }: { onRunCreated?: () => void }) {
  const searchParams = useSearchParams();
  const source = searchParams.get('source') === 'benchmark' ? 'benchmark' : 'default';
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading: loading } = useQuery({
    queryKey: ['executions-run-options'],
    queryFn: ({ signal }) => fetchRunOptions(signal),
    enabled: showModal,
  });
  const strategies = useMemo(() => data?.strategies ?? [], [data]);
  const presets = useMemo(() => data?.presets ?? [], [data]);
  const [selection, dispatchSelection] = useReducer(selectionReducer, INITIAL_SELECTION);
  const {
    selectedStrategyIds,
    selectedPresetIds,
    selectedBenchmarkProjectIds,
    strategySearch,
    presetSearch,
    benchmarkMode,
  } = selection;
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

  const toggleStrategy = useCallback((id: string) => {
    dispatchSelection({ type: 'toggleStrategy', id });
  }, []);

  const togglePreset = useCallback((id: string) => {
    dispatchSelection({ type: 'togglePreset', id });
  }, []);

  const toggleBenchmarkProject = useCallback((id: string) => {
    dispatchSelection({ type: 'toggleBenchmarkProject', id });
  }, []);

  const handleRun = useCallback(async () => {
    if (selectedStrategyIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    const groupId = crypto.randomUUID();

    try {
      const results = await executeRuns({
        benchmarkMode,
        selectedStrategyIds,
        selectedPresetIds,
        selectedBenchmarkProjectIds,
        numberOfImages,
        groupId,
      });
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      if (failures.length > 0) {
        const succeeded = results.length - failures.length;
        setError(
          `${failures[0]?.reason instanceof Error ? failures[0].reason.message : 'Failed to start run'}${
            succeeded > 0 ? ' Some runs were still created.' : ''
          }`,
        );
        if (succeeded > 0) onRunCreated?.();
        setSubmitting(false);
        return;
      }
      setShowModal(false);
      dispatchSelection({ type: 'resetAfterRun', benchmarkMode: source === 'benchmark' });
      onRunCreated?.();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [
    benchmarkMode,
    selectedBenchmarkProjectIds,
    selectedPresetIds,
    selectedStrategyIds,
    numberOfImages,
    onRunCreated,
    source,
  ]);

  const secondaryCount = benchmarkMode
    ? selectedBenchmarkProjectIds.length
    : selectedPresetIds.length;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowModal(true);
          setError(null);
          dispatchSelection({
            type: 'openModal',
            benchmarkMode: source === 'benchmark',
            benchmarkProjectIds: source === 'benchmark' ? DEFAULT_BENCHMARK_PROJECT_IDS : [],
          });
        }}
        className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
          />
        </svg>
        Run
      </button>

      {showModal && (
        <Modal
          onClose={() => {
            setShowModal(false);
            setError(null);
          }}
          labelledById="new-run-title"
          containerClassName="z-[9999]"
          backdropClassName="cursor-pointer bg-black/50"
          className="flex h-[min(80vh,640px)] w-full max-w-3xl flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
        >
          <div className="shrink-0 border-b border-gray-200 px-5 py-4">
            <h3 id="new-run-title" className="text-lg font-semibold text-gray-900">
              New Run
            </h3>
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
                  dispatchSelection({
                    type: 'setBenchmarkMode',
                    benchmarkMode: e.target.checked,
                    benchmarkProjectIds: e.target.checked ? DEFAULT_BENCHMARK_PROJECT_IDS : [],
                  });
                }}
                className="size-4 rounded border-gray-300"
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
              <MultiSelectColumn
                title="Strategies"
                selectedCount={selectedStrategyIds.length}
                onClear={() => dispatchSelection({ type: 'clearStrategies' })}
                searchValue={strategySearch}
                onSearchChange={(value) => dispatchSelection({ type: 'setStrategySearch', value })}
                searchPlaceholder="Search strategies…"
                searchAriaLabel="Search strategies"
                items={filteredStrategies.map((s) => ({ id: s.id, label: s.name || 'Unnamed' }))}
                selectedIds={selectedStrategyIds}
                onToggle={toggleStrategy}
                emptyMessage={strategies.length === 0 ? 'No strategies available' : 'No matches'}
              />

              <MultiSelectColumn
                title={benchmarkMode ? 'Benchmark projects' : 'Input presets'}
                selectedCount={secondaryCount}
                onClear={() =>
                  dispatchSelection({
                    type: benchmarkMode ? 'clearBenchmarkProjects' : 'clearPresets',
                  })
                }
                searchValue={presetSearch}
                onSearchChange={(value) => dispatchSelection({ type: 'setPresetSearch', value })}
                searchPlaceholder={benchmarkMode ? 'Search project IDs…' : 'Search presets…'}
                searchAriaLabel={benchmarkMode ? 'Search project IDs' : 'Search presets'}
                items={(benchmarkMode ? filteredBenchmarkProjects : filteredPresets).map(
                  (entry) => {
                    const id = typeof entry === 'string' ? entry : entry.id;
                    const label = typeof entry === 'string' ? entry : entry.name || 'Untitled';
                    return { id, label };
                  },
                )}
                selectedIds={benchmarkMode ? selectedBenchmarkProjectIds : selectedPresetIds}
                onToggle={benchmarkMode ? toggleBenchmarkProject : togglePreset}
                emptyMessage={
                  benchmarkMode
                    ? 'No matches'
                    : presets.length === 0
                      ? 'No presets available'
                      : 'No matches'
                }
              />
            </div>
          )}

          {error && <p className="shrink-0 px-5 pb-2 text-sm text-red-600">{error}</p>}

          <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 px-5 py-3">
            <NumberOfImagesInput value={numberOfImages} onChange={setNumberOfImages} />
          </div>

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
              disabled={
                submitting ||
                selectedStrategyIds.length === 0 ||
                (benchmarkMode
                  ? selectedBenchmarkProjectIds.length === 0
                  : selectedPresetIds.length === 0)
              }
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Starting…
                </>
              ) : benchmarkMode ? (
                'Run benchmarks'
              ) : (
                'Run (1 batch)'
              )}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

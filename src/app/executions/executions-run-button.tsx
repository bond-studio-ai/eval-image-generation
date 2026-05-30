"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { MultiSelectColumn } from "./_components/multi-select-column";
import { NumberOfImagesInput } from "./_components/number-of-images-input";
import { BENCHMARK_PROJECT_IDS, DEFAULT_BENCHMARK_PROJECT_IDS, executeRuns, fetchRunOptions } from "./_components/run-options";
import { INITIAL_SELECTION, selectionReducer } from "./_components/selection-state";

export function ExecutionsRunButton(props: { onRunCreated?: () => void }) {
  return (
    <Suspense fallback={null}>
      <ExecutionsRunButtonInner {...props} />
    </Suspense>
  );
}

function ExecutionsRunButtonInner({ onRunCreated }: { onRunCreated?: () => void }) {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") === "benchmark" ? "benchmark" : "default";
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading: loading } = useQuery({
    queryKey: ["executions-run-options"],
    queryFn: ({ signal }) => fetchRunOptions(signal),
    enabled: showModal
  });
  const strategies = useMemo(() => data?.strategies ?? [], [data]);
  const presets = useMemo(() => data?.presets ?? [], [data]);
  const [selection, dispatchSelection] = useReducer(selectionReducer, INITIAL_SELECTION);
  const { selectedStrategyIds, selectedPresetIds, selectedBenchmarkProjectIds, strategySearch, presetSearch, benchmarkMode } = selection;
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
    return presets.filter((p) => (p.name ?? "").toLowerCase().includes(q));
  }, [presets, presetSearch]);

  const filteredBenchmarkProjects = useMemo(() => {
    const q = presetSearch.toLowerCase().trim();
    if (!q) return [...BENCHMARK_PROJECT_IDS];
    return BENCHMARK_PROJECT_IDS.filter((projectId) => projectId.toLowerCase().includes(q));
  }, [presetSearch]);

  const toggleStrategy = useCallback((id: string) => {
    dispatchSelection({ type: "toggleStrategy", id });
  }, []);

  const togglePreset = useCallback((id: string) => {
    dispatchSelection({ type: "togglePreset", id });
  }, []);

  const toggleBenchmarkProject = useCallback((id: string) => {
    dispatchSelection({ type: "toggleBenchmarkProject", id });
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
        groupId
      });
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failures.length > 0) {
        const succeeded = results.length - failures.length;
        setError(`${failures[0]?.reason instanceof Error ? failures[0].reason.message : "Failed to start run"}${succeeded > 0 ? " Some runs were still created." : ""}`);
        if (succeeded > 0) onRunCreated?.();
        setSubmitting(false);
        return;
      }
      setShowModal(false);
      dispatchSelection({ type: "resetAfterRun", benchmarkMode: source === "benchmark" });
      onRunCreated?.();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }, [benchmarkMode, selectedBenchmarkProjectIds, selectedPresetIds, selectedStrategyIds, numberOfImages, onRunCreated, source]);

  const secondaryCount = benchmarkMode ? selectedBenchmarkProjectIds.length : selectedPresetIds.length;

  return (
    <>
      <Button
        onClick={() => {
          setShowModal(true);
          setError(null);
          dispatchSelection({
            type: "openModal",
            benchmarkMode: source === "benchmark",
            benchmarkProjectIds: source === "benchmark" ? DEFAULT_BENCHMARK_PROJECT_IDS : []
          });
        }}
        iconLeft={<PlayIcon className="size-4" />}
      >
        Run
      </Button>

      {showModal && (
        <Modal
          onClose={() => {
            setShowModal(false);
            setError(null);
          }}
          labelledById="new-run-title"
          containerClassName="z-[9999]"
          backdropClassName="cursor-pointer bg-overlay/50"
          className="border-border bg-surface flex h-[min(80vh,640px)] w-full max-w-3xl flex-col rounded-lg border shadow-xl"
        >
          <div className="border-border shrink-0 border-b px-5 py-4">
            <h3 id="new-run-title" className="text-text-primary text-h3">
              New Run
            </h3>
            <p className="text-text-secondary text-body mt-1">
              {benchmarkMode
                ? "Select strategies and benchmark project IDs. This creates benchmark runs for the selected strategies."
                : "Select strategies and input presets. This creates one batch: strategies × presets × images to generate."}
            </p>
            <label className="text-text-secondary text-body mt-3 inline-flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={benchmarkMode}
                onChange={(e) => {
                  dispatchSelection({
                    type: "setBenchmarkMode",
                    benchmarkMode: e.target.checked,
                    benchmarkProjectIds: e.target.checked ? DEFAULT_BENCHMARK_PROJECT_IDS : []
                  });
                }}
                className="border-border-strong size-4 rounded"
              />
              Use benchmark projects
            </label>
          </div>

          {loading ? (
            <div className="text-text-muted text-body flex flex-1 items-center justify-center py-12">Loading…</div>
          ) : (
            <div className="divide-border grid min-h-0 flex-1 grid-cols-2 divide-x overflow-hidden">
              <MultiSelectColumn
                title="Strategies"
                selectedCount={selectedStrategyIds.length}
                onClear={() => dispatchSelection({ type: "clearStrategies" })}
                searchValue={strategySearch}
                onSearchChange={(value) => dispatchSelection({ type: "setStrategySearch", value })}
                searchPlaceholder="Search strategies…"
                searchAriaLabel="Search strategies"
                items={filteredStrategies.map((s) => ({ id: s.id, label: s.name || "Unnamed" }))}
                selectedIds={selectedStrategyIds}
                onToggle={toggleStrategy}
                emptyMessage={strategies.length === 0 ? "No strategies available" : "No matches"}
              />

              <MultiSelectColumn
                title={benchmarkMode ? "Benchmark projects" : "Input presets"}
                selectedCount={secondaryCount}
                onClear={() =>
                  dispatchSelection({
                    type: benchmarkMode ? "clearBenchmarkProjects" : "clearPresets"
                  })
                }
                searchValue={presetSearch}
                onSearchChange={(value) => dispatchSelection({ type: "setPresetSearch", value })}
                searchPlaceholder={benchmarkMode ? "Search project IDs…" : "Search presets…"}
                searchAriaLabel={benchmarkMode ? "Search project IDs" : "Search presets"}
                items={(benchmarkMode ? filteredBenchmarkProjects : filteredPresets).map((entry) => {
                  const id = typeof entry === "string" ? entry : entry.id;
                  const label = typeof entry === "string" ? entry : entry.name || "Untitled";
                  return { id, label };
                })}
                selectedIds={benchmarkMode ? selectedBenchmarkProjectIds : selectedPresetIds}
                onToggle={benchmarkMode ? toggleBenchmarkProject : togglePreset}
                emptyMessage={benchmarkMode ? "No matches" : presets.length === 0 ? "No presets available" : "No matches"}
              />
            </div>
          )}

          {error && <p className="text-danger-600 text-body shrink-0 px-5 pb-2">{error}</p>}

          <div className="border-border bg-surface-muted/50 shrink-0 border-t px-5 py-3">
            <NumberOfImagesInput value={numberOfImages} onChange={setNumberOfImages} />
          </div>

          <div className="border-border flex shrink-0 items-center justify-end gap-2 border-t px-5 py-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRun} disabled={submitting || selectedStrategyIds.length === 0 || (benchmarkMode ? selectedBenchmarkProjectIds.length === 0 : selectedPresetIds.length === 0)} loading={submitting}>
              {submitting ? "Starting…" : benchmarkMode ? "Run benchmarks" : "Run (1 batch)"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

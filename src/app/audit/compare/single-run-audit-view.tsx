"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { ExpandableImage } from "@/components/expandable-image";
import { RunJudgeEvaluationsSection } from "@/components/run-judge-evaluations-section";
import { Spinner } from "@/components/ui/spinner";
import { serviceUrl } from "@/lib/api-base";
import { coerceString } from "@/lib/coerce-string";
import { parseStrategyRunJudgeResults, type RawRunJudgeResults, type StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

function statusBadgeClass(status: string): string {
  if (status === "completed") return "bg-success-100 text-success-700";
  if (status === "failed") return "bg-danger-100 text-danger-700";
  return "bg-surface-sunken text-text-secondary";
}

function errorMessageOr(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface InputImage {
  url: string;
  label: string;
  isComposite?: boolean;
  sourceImages?: { url: string; label: string }[];
}

interface StepResult {
  id: string;
  status: string;
  outputUrl: string | null;
  error: string | null;
  executionTime: number | null;
  processedUserPrompt: string | null;
  processedSystemPrompt: string | null;
  inputImages: InputImage[] | null;
  requestConfig: Record<string, unknown> | null;
  step: {
    stepOrder: number;
    name: string | null;
    model: string;
  } | null;
}

interface RunData {
  id: string;
  status: string;
  createdAt: string;
  source: string | null;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: InputImage[] | null;
  judgeResults: StrategyRunJudgeResultEntry[];
  strategy: {
    id: string;
    name: string;
  };
  stepResults: StepResult[];
}

const SOURCE_LABELS: Record<string, string> = {
  preset: "Preset Run",
  raw_input: "Real Input",
  batch: "Batch Run",
  retry: "Preset Run"
};

const CONFIG_LABELS: Record<string, string> = {
  model: "Model",
  aspect_ratio: "Aspect Ratio",
  output_resolution: "Resolution",
  temperature: "Temperature",
  use_google_search: "Google Search",
  tag_images: "Tag Images"
};

function SectionHeader({ title }: { title: string }) {
  return <h3 className="border-border text-text-secondary text-body border-b pb-2 font-semibold">{title}</h3>;
}

function ImageGrid({ images }: { images: InputImage[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {images.map((img, i) => (
          <div key={img.url}>
            <div
              className={`bg-surface-muted relative aspect-square overflow-hidden rounded-md border ${img.isComposite ? "border-accent-400 ring-accent-200 cursor-pointer ring-1" : "border-border"}`}
              {...(img.isComposite
                ? {
                    onClick: () => {
                      setExpandedGroup(expandedGroup === i ? null : i);
                    }
                  }
                : {})}
            >
              <CdnImage src={img.url} alt={img.label} fill sizes="(max-width:768px) 25vw, 120px" className="object-cover" />
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              {img.isComposite && <span className="bg-accent-100 text-accent-700 inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold">Group</span>}
              <p className="text-text-muted truncate text-[10px]" title={img.label}>
                {img.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {expandedGroup != null && images[expandedGroup]?.isComposite && images[expandedGroup].sourceImages && (
        <div className="border-accent-200 bg-accent-50 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-accent-800 text-caption font-semibold">
              {images[expandedGroup].label} &mdash; {images[expandedGroup].sourceImages.length} source images
            </p>
            <button
              type="button"
              onClick={() => {
                setExpandedGroup(null);
              }}
              className="text-accent-600 hover:text-accent-800 text-caption"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {images[expandedGroup].sourceImages.map((src) => (
              <div key={src.url}>
                <div className="border-accent-200 bg-surface relative aspect-square overflow-hidden rounded-md border">
                  <CdnImage src={src.url} alt={src.label} fill sizes="(max-width:768px) 25vw, 120px" className="object-cover" />
                </div>
                <p className="text-accent-700 mt-0.5 truncate text-[10px]" title={src.label}>
                  {src.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SingleRunAuditView({ runId }: { runId: string }) {
  const {
    data: run = null,
    isLoading: loading,
    isError,
    error: queryError
  } = useQuery({
    queryKey: ["audit-run", runId],
    queryFn: async ({ signal }) => {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}`), {
        cache: "no-store",
        signal
      });
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }
      const json = (await res.json()) as { data?: unknown };
      const raw = json.data as RawRunJudgeResults;
      return {
        ...(json.data as RunData),
        judgeResults: parseStrategyRunJudgeResults(raw.judgeResults)
      };
    },
    enabled: Boolean(runId)
  });

  const error = isError ? errorMessageOr(queryError, "Unknown error") : null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" className="text-text-disabled" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="text-danger-600 flex h-64 flex-col items-center justify-center">
        <p className="font-medium">Error loading run</p>
        <p className="text-body mt-1">{error ?? "Run not found"}</p>
      </div>
    );
  }

  const steps = run.stepResults.toSorted((a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary text-h3">Run Audit</h2>
        <Link href={`/strategies/${run.strategy.id}/runs/${run.id}`} className="text-primary-600 hover:text-primary-500 text-caption">
          View run detail &rarr;
        </Link>
      </div>

      {/* Run header */}
      <div className="border-border bg-surface-muted mt-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary text-body font-medium">{run.strategy.name}</p>
            <p className="text-text-muted text-caption mt-0.5">{new Date(run.createdAt).toLocaleString()}</p>
            <p className="text-text-disabled mt-0.5 font-mono text-[10px]">{run.id}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(run.status)}`}>{run.status}</span>
            {run.source && <span className="bg-primary-100 text-primary-700 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium">{SOURCE_LABELS[run.source] ?? run.source}</span>}
            {run.judgeScore != null && (
              <span className="bg-primary-100 text-primary-700 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium">
                Judge: {run.judgeScore}
                {run.isJudgeSelected ? " (Selected)" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mt-6 space-y-6">
        {steps.map((sr, i) => {
          const stepName = sr.step?.name ?? `Step ${sr.step?.stepOrder ?? i + 1}`;
          const hasAudit = sr.processedSystemPrompt || sr.processedUserPrompt || sr.inputImages || sr.requestConfig;

          return (
            <div key={sr.id} className="border-border bg-surface rounded-lg border shadow-xs">
              <div className="border-border bg-surface-muted flex items-center justify-between border-b px-4 py-3">
                <span className="text-text-secondary text-body font-semibold">{stepName}</span>
                <div className="flex items-center gap-2">
                  {sr.executionTime != null && <span className="text-text-muted text-[10px]">{(sr.executionTime / 1000).toFixed(1)}s</span>}
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(sr.status)}`}>{sr.status}</span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                {sr.requestConfig && (
                  <div>
                    <SectionHeader title="Request Config" />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(sr.requestConfig).map(([key, val]) => (
                        <span key={key} className="bg-surface-sunken text-text-secondary inline-flex items-center rounded px-2 py-0.5 text-[11px]">
                          <span className="text-text-muted font-medium">{CONFIG_LABELS[key] ?? key}:</span>
                          &nbsp;{coerceString(val) ?? "null"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {sr.processedSystemPrompt && (
                  <div>
                    <SectionHeader title="System Prompt" />
                    <pre className="border-border bg-surface-muted text-text-secondary text-caption mt-2 max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{sr.processedSystemPrompt}</pre>
                  </div>
                )}

                {sr.processedUserPrompt && (
                  <div>
                    <SectionHeader title="User Prompt" />
                    <pre className="border-border bg-surface-muted text-text-secondary text-caption mt-2 max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{sr.processedUserPrompt}</pre>
                  </div>
                )}

                {sr.inputImages && sr.inputImages.length > 0 && (
                  <div>
                    <SectionHeader title={`Input Images (${sr.inputImages.length})`} />
                    <div className="mt-2">
                      <ImageGrid images={sr.inputImages} />
                    </div>
                  </div>
                )}

                {sr.outputUrl && (
                  <div>
                    <SectionHeader title="Output" />
                    <div className="mt-2">
                      <ExpandableImage src={sr.outputUrl} alt={`${stepName} output`} wrapperClassName="relative block h-64 w-full max-w-xl rounded-lg border border-border bg-surface-muted" />
                    </div>
                  </div>
                )}

                {sr.error && (
                  <div className="border-danger-200 bg-danger-50 rounded-md border p-2">
                    <p className="text-danger-700 text-caption">{sr.error}</p>
                  </div>
                )}

                {!hasAudit && !sr.outputUrl && !sr.error && <p className="text-text-disabled text-caption">No audit data for this step.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Judge audit */}
      {run.judgeResults.length > 0 && (
        <div className="mt-6 space-y-4">
          <RunJudgeEvaluationsSection judgeResults={run.judgeResults} />
        </div>
      )}

      {run.judgeResults.length === 0 && (run.judgeScore != null || run.judgeSystemPrompt || run.judgeUserPrompt || run.judgeInputImages || run.judgeReasoning || run.judgeOutput) && (
        <div className="border-primary-200 bg-surface mt-6 rounded-lg border shadow-xs">
          <div className="border-primary-200 bg-primary-50 border-b px-4 py-3">
            <span className="text-primary-800 text-body font-semibold">Judge</span>
          </div>
          <div className="space-y-4 p-4">
            {run.judgeScore != null && (
              <div className="bg-surface-muted rounded-md p-3">
                <p className="text-text-disabled text-[10px] font-semibold tracking-wider uppercase">Score</p>
                <p className="text-text-secondary text-h3 mt-1">{run.judgeScore}</p>
                {run.isJudgeSelected && <p className="text-warning-600 text-caption">Selected</p>}
                {run.judgeReasoning && <p className="text-text-secondary text-caption mt-1">{run.judgeReasoning}</p>}
              </div>
            )}

            {run.judgeOutput && (
              <div>
                <SectionHeader title="Judge parsed output" />
                <pre className="border-border bg-surface-muted text-text-secondary text-caption mt-2 max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{run.judgeOutput}</pre>
              </div>
            )}

            {run.judgeSystemPrompt && (
              <div>
                <SectionHeader title="Judge System Prompt" />
                <pre className="border-border bg-surface-muted text-text-secondary text-caption mt-2 max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{run.judgeSystemPrompt}</pre>
              </div>
            )}

            {run.judgeUserPrompt && (
              <div>
                <SectionHeader title="Judge User Prompt" />
                <pre className="border-border bg-surface-muted text-text-secondary text-caption mt-2 max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{run.judgeUserPrompt}</pre>
              </div>
            )}

            {run.judgeInputImages && run.judgeInputImages.length > 0 && (
              <div>
                <SectionHeader title={`Judge Input Images (${run.judgeInputImages.length})`} />
                <div className="mt-2">
                  <ImageGrid images={run.judgeInputImages} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

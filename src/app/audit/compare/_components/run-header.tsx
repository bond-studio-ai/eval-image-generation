import type { RunData } from "./types";

const SOURCE_LABELS: Record<string, string> = {
  preset: "Preset Run",
  raw_input: "Real Input",
  batch: "Batch Run",
  retry: "Preset Run"
};

export function RunHeader({ run, label }: { run: RunData; label: string }) {
  return (
    <div className="border-border bg-surface-muted rounded-lg border p-3">
      <p className="text-text-disabled text-caption font-semibold tracking-wider uppercase">{label}</p>
      <p className="text-text-primary text-body mt-1 font-medium">{run.strategy.name}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${run.status === "completed" ? "bg-success-100 text-success-700" : run.status === "failed" ? "bg-danger-100 text-danger-700" : "bg-surface-sunken text-text-secondary"}`}
        >
          {run.status}
        </span>
        {run.source && <span className="bg-primary-100 text-primary-700 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium">{SOURCE_LABELS[run.source] ?? run.source}</span>}
        {run.judgeScore != null && <span className="bg-primary-100 text-primary-700 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium">Judge: {run.judgeScore}</span>}
      </div>
      <p className="text-text-muted mt-1 text-[10px]">{new Date(run.createdAt).toLocaleString()}</p>
      <p className="text-text-disabled mt-0.5 font-mono text-[10px]">{run.id}</p>
    </div>
  );
}

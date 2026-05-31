import { CdnImage } from "@/components/cdn-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { CheckCircleIcon } from "@/components/ui/icons";
import { type RunListItem, SOURCE_LABELS, THUMB } from "./run-picker-types";

function statusToTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "neutral" as const;
}

export function RunPickerCard({ run, isSelected, onSelect }: { run: RunListItem; isSelected: boolean; onSelect: () => void }) {
  const statusTone = statusToTone(run.status);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("rounded-card flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors", isSelected ? "border-primary-400 bg-primary-50 ring-primary-400 ring-1" : "border-border bg-surface hover:bg-surface-muted")}
    >
      <div className="shrink-0">
        {run.lastOutputUrl ? (
          <CdnImage src={run.lastOutputUrl} alt="" width={THUMB} height={THUMB} className="border-border rounded border object-cover" style={{ width: THUMB, height: THUMB }} />
        ) : (
          <span className="border-border bg-surface-muted text-text-disabled inline-flex items-center justify-center rounded border text-[10px]" style={{ width: THUMB, height: THUMB }}>
            --
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body text-text-primary truncate font-medium">{run.strategyName ?? "Unknown strategy"}</p>
        <p className="text-text-muted truncate text-[11px]">
          {run.inputPresetName ?? "No preset"} &middot; {new Date(run.createdAt).toLocaleString()}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          <Badge tone={statusTone} variant="soft" size="sm">
            {run.status}
          </Badge>
          {run.source && (
            <Badge tone="info" variant="soft" size="sm">
              {SOURCE_LABELS[run.source] ?? run.source}
            </Badge>
          )}
          {run.judgeScore != null && (
            <Badge tone="accent" variant="soft" size="sm">
              J:{run.judgeScore}
            </Badge>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {isSelected ? <CheckCircleIcon className="text-primary-600 size-5" aria-hidden="true" /> : <span className="border-border-strong inline-flex size-5 items-center justify-center rounded-full border-2" aria-hidden="true" />}
      </div>
    </button>
  );
}

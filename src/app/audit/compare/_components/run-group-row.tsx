import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { ChevronDownIcon } from "@/components/ui/icons";
import { RunPickerCard } from "./run-picker-card";
import { type AuditRunGroup, SOURCE_LABELS } from "./run-picker-types";

interface RunGroupRowProps {
  group: AuditRunGroup;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  leftId: string | null;
  rightId: string | null;
  onToggleSelect: (id: string) => void;
}

export function RunGroupRow({ group, isExpanded, onToggleExpanded, leftId, rightId, onToggleSelect }: RunGroupRowProps) {
  return (
    <div className="rounded-card border-border bg-surface-muted/40 border">
      <button type="button" onClick={onToggleExpanded} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="text-caption text-text-secondary block truncate font-semibold tracking-wide uppercase">{group.groupId || group.batchRunId ? `Group ${group.id.slice(0, 8)}` : `Run ${group.id.slice(0, 8)}`}</span>
          <span className="text-caption text-text-muted mt-0.5 block truncate">
            {group.strategyName ?? "Unknown strategy"} · {new Date(group.createdAt).toLocaleString()}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Badge tone="neutral" variant="outline" size="sm">
            {group.runs.length} run{group.runs.length === 1 ? "" : "s"}
          </Badge>
          {group.source ? (
            <Badge tone="info" variant="outline" size="sm">
              {SOURCE_LABELS[group.source] ?? group.source}
            </Badge>
          ) : null}
          <ChevronDownIcon className={cn("text-text-disabled h-4 w-4 transition-transform", isExpanded && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {isExpanded ? (
        <div className="border-border bg-surface space-y-1.5 border-t p-2">
          {group.runs.map((run) => (
            <RunPickerCard
              key={run.id}
              run={run}
              isSelected={run.id === leftId || run.id === rightId}
              onSelect={() => {
                onToggleSelect(run.id);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

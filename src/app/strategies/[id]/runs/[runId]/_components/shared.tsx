import { ChevronRightIcon } from "@/components/ui/icons";

export { StatusBadge } from "../../../status-badge";

const SOURCE_LABELS: Record<string, string> = {
  preset: "Preset Run",
  raw_input: "Real Input",
  batch: "Batch Run",
  retry: "Retry"
};

const SOURCE_BADGE_COLORS: Record<string, string> = {
  preset: "bg-primary-100 text-primary-700",
  raw_input: "bg-accent-100 text-accent-700",
  batch: "bg-success-100 text-success-700",
  retry: "bg-warning-100 text-warning-700"
};

export const STEP_STATUS_DOT: Record<string, string> = {
  pending: "bg-border-strong",
  running: "bg-primary-400 animate-pulse",
  completed: "bg-success-500",
  failed: "bg-danger-500",
  skipped: "bg-warning-400"
};

export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  return <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${SOURCE_BADGE_COLORS[source] ?? "bg-surface-sunken text-text-secondary"}`}>{SOURCE_LABELS[source] ?? source}</span>;
}

export function ChevronIcon({ open, className = "h-4 w-4" }: { open: boolean; className?: string }) {
  return <ChevronRightIcon className={`${className} text-text-disabled shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />;
}

export function SectionToggle({ title, count, badge, open, onToggle, children }: { title: string; count?: number; badge?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface rounded-lg border shadow-xs">
      <button type="button" onClick={onToggle} className="hover:bg-surface-muted flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors">
        <ChevronIcon open={open} />
        <span className="text-text-primary text-body font-semibold">{title}</span>
        {count != null && <span className="bg-surface-sunken text-text-secondary inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium">{count}</span>}
        {badge}
      </button>
      {open && <div className="border-border border-t">{children}</div>}
    </div>
  );
}

export function ConfigTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="bg-surface-sunken text-text-secondary text-caption inline-flex items-center rounded-full px-2.5 py-0.5">
      <span className="text-text-muted font-medium">{label}:</span>&nbsp;{value}
    </span>
  );
}

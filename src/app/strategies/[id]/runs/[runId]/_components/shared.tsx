import { ChevronRightIcon } from "@/components/ui/icons";

const SOURCE_LABELS: Record<string, string> = {
  preset: "Preset Run",
  raw_input: "Real Input",
  batch: "Batch Run",
  retry: "Retry"
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-amber-100 text-amber-700"
};

const SOURCE_BADGE_COLORS: Record<string, string> = {
  preset: "bg-blue-100 text-blue-700",
  raw_input: "bg-purple-100 text-purple-700",
  batch: "bg-teal-100 text-teal-700",
  retry: "bg-orange-100 text-orange-700"
};

export const STEP_STATUS_DOT: Record<string, string> = {
  pending: "bg-gray-300",
  running: "bg-blue-400 animate-pulse",
  completed: "bg-green-500",
  failed: "bg-red-500",
  skipped: "bg-amber-400"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.pending}`}>{status}</span>;
}

export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SOURCE_BADGE_COLORS[source] ?? "bg-gray-100 text-gray-700"}`}>{SOURCE_LABELS[source] ?? source}</span>;
}

export function ChevronIcon({ open, className = "h-4 w-4" }: { open: boolean; className?: string }) {
  return <ChevronRightIcon className={`${className} shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />;
}

export function SectionToggle({ title, count, badge, open, onToggle, children }: { title: string; count?: number; badge?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50">
        <ChevronIcon open={open} />
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {count != null && <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{count}</span>}
        {badge}
      </button>
      {open && <div className="border-t border-gray-200">{children}</div>}
    </div>
  );
}

export function ConfigTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
      <span className="font-medium text-gray-500">{label}:</span>&nbsp;{value}
    </span>
  );
}

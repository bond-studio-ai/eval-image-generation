/** Canonical strategy-run status badge, shared by the runs list/matrix and the run-detail view. */
const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-surface-sunken text-text-secondary",
  running: "bg-primary-100 text-primary-700",
  completed: "bg-success-100 text-success-700",
  failed: "bg-danger-100 text-danger-700",
  skipped: "bg-warning-100 text-warning-700"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES["pending"] ?? ""}`}>{status}</span>;
}

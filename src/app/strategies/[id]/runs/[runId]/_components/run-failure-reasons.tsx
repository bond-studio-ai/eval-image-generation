import type { StepResult } from "./types";

export function RunFailureReasons({ status, sorted }: { status: string; sorted: StepResult[] }) {
  if (status === "skipped") {
    const reasons = sorted.flatMap((sr) => (sr.status === "skipped" && sr.error ? [{ step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`, reason: sr.error }] : []));
    if (reasons.length === 0) return null;
    return (
      <div className="border-warning-200 bg-warning-50 mt-4 rounded-lg border p-4">
        <p className="text-warning-800 text-body font-medium">Why this run was skipped</p>
        <ul className="text-warning-700 text-body mt-2 list-inside list-disc space-y-1">
          {reasons.map(({ step, reason }) => (
            <li key={`${step}-${reason}`}>
              <span className="font-medium">{step}:</span> {reason}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (status === "failed") {
    const reasons = sorted.flatMap((sr) => ((sr.status === "failed" || sr.status === "skipped") && sr.error ? [{ step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`, reason: sr.error }] : []));
    if (reasons.length === 0) return null;
    return (
      <div className="border-danger-200 bg-danger-50 mt-4 rounded-lg border p-4">
        <p className="text-danger-800 text-body font-medium">Why this run failed</p>
        <ul className="text-danger-700 text-body mt-2 list-inside list-disc space-y-1">
          {reasons.map(({ step, reason }) => (
            <li key={`${step}-${reason}`}>
              <span className="font-medium">{step}:</span> {reason}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

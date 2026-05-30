import type { StepResult } from './types';

export function RunFailureReasons({ status, sorted }: { status: string; sorted: StepResult[] }) {
  if (status === 'skipped') {
    const reasons = sorted.flatMap((sr) =>
      sr.status === 'skipped' && sr.error
        ? [{ step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`, reason: sr.error }]
        : [],
    );
    if (reasons.length === 0) return null;
    return (
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">Why this run was skipped</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700">
          {reasons.map(({ step, reason }) => (
            <li key={`${step}-${reason}`}>
              <span className="font-medium">{step}:</span> {reason}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (status === 'failed') {
    const reasons = sorted.flatMap((sr) =>
      (sr.status === 'failed' || sr.status === 'skipped') && sr.error
        ? [{ step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`, reason: sr.error }]
        : [],
    );
    if (reasons.length === 0) return null;
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Why this run failed</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
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

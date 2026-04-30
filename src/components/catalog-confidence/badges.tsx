import type {
  CalibrationStatus,
  HumanVerdict,
  JudgeBaselineExpected,
  PromptStatus,
  RoutingDecision,
} from '@/lib/catalog-feed-client';

/**
 * Presentation helpers for the calibrated-confidence pages. Every
 * reviewer surface (runs, prompts, calibrations, thresholds) renders a
 * small set of categorical statuses, so we centralize the tailwind
 * colour mapping here instead of duplicating it in each page.
 */

const DECISION_STYLES: Record<RoutingDecision, string> = {
  auto_ship: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20',
  spot_check: 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
  hold_for_review: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20',
};

const DECISION_LABELS: Record<RoutingDecision, string> = {
  auto_ship: 'Auto-ship',
  spot_check: 'Spot-check',
  hold_for_review: 'Hold',
};

export function DecisionBadge({ decision }: { decision: RoutingDecision }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${DECISION_STYLES[decision]}`}
    >
      {DECISION_LABELS[decision]}
    </span>
  );
}

const VERDICT_STYLES: Record<HumanVerdict, string> = {
  accept: 'bg-green-100 text-green-800',
  reject: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
};

export function VerdictBadge({ verdict }: { verdict: HumanVerdict }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${VERDICT_STYLES[verdict]}`}
    >
      {verdict}
    </span>
  );
}

const PROMPT_STATUS_STYLES: Record<PromptStatus, string> = {
  proposed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  retired: 'bg-gray-100 text-gray-700',
};

export function PromptStatusBadge({ status }: { status: PromptStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${PROMPT_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

const CALIBRATION_STATUS_STYLES: Record<CalibrationStatus, string> = {
  active: 'bg-green-100 text-green-800',
  retired: 'bg-gray-100 text-gray-700',
};

export function CalibrationStatusBadge({ status }: { status: CalibrationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${CALIBRATION_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

/**
 * ScoreCell renders a 0..1 confidence score as "0.000" right-aligned,
 * with a thin coloured bar that makes it scannable at a glance. `null`
 * scores render as an em-dash.
 */
export function ScoreCell({ value }: { value: number | null | undefined }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-gray-400">—</span>;
  }
  const pct = Math.max(0, Math.min(1, value));
  const color = pct >= 0.95 ? 'bg-green-500' : pct >= 0.7 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-800 tabular-nums">{value.toFixed(3)}</span>
      <div className="h-1.5 w-16 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * StatusBadge surfaces the run's lifecycle state (succeeded, failed,
 * etc.) on the runs list. Today the queue mostly produces `succeeded`
 * or `failed`; we render anything else as a neutral "in progress"
 * affordance so transient states don't render as plain text.
 */
const STATUS_STYLES: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20',
  failed: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20',
};

export function StatusBadge({ status }: { status: string }) {
  const cls =
    STATUS_STYLES[status] ?? 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/20';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${cls}`}>
      {status || 'pending'}
    </span>
  );
}

// ─── Judge baselines ────────────────────────────────────────────────────────

/**
 * BaselineExpectedBadge labels what the operator said the judge SHOULD
 * return for this product. Pass is green (treat as gold-standard
 * positive), fail is red (gold-standard negative). Used on the
 * baseline editor and the run-detail judge table.
 */
const BASELINE_EXPECTED_STYLES: Record<JudgeBaselineExpected, string> = {
  pass: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20',
  fail: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20',
};

export function BaselineExpectedBadge({ expected }: { expected: JudgeBaselineExpected }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ${BASELINE_EXPECTED_STYLES[expected]}`}
    >
      {expected === 'pass' ? 'Should pass' : 'Should fail'}
    </span>
  );
}

/**
 * BaselineMatchBadge renders the per-run "did the judge agree with
 * the gold label" outcome. Three branches:
 *   - true  → match (green)
 *   - false → mismatch (red)
 *   - null  → unlabeled product (neutral em-dash)
 *
 * Optional `expected` is rendered as a subtitle so reviewers can see
 * the gold label and the observed verdict in one badge cluster
 * without crowding the cell with a second badge.
 */
export function BaselineMatchBadge({
  match,
  expected,
  observedPass,
}: {
  match: boolean | null | undefined;
  expected?: JudgeBaselineExpected | null;
  observedPass?: boolean | null;
}) {
  if (match == null) {
    return (
      <span className="text-[11px] text-gray-400" title="Product is not in the labeled baseline.">
        —
      </span>
    );
  }
  const cls = match
    ? 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20'
    : 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20';
  const label = match ? 'Match' : 'Mismatch';
  const obs =
    observedPass == null ? null : (
      <span className="text-[10px] text-gray-500">obs={observedPass ? 'pass' : 'fail'}</span>
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${cls}`}
      >
        {label}
      </span>
      {expected && <span className="text-[10px] text-gray-500">exp={expected}</span>}
      {obs}
    </span>
  );
}

/**
 * AccuracyCell renders a 0..1 rate (e.g. baseline pass/fail rate)
 * with a thin coloured bar. Mirrors ScoreCell visually but uses
 * percent-formatted text so it reads naturally as accuracy. `null`
 * inputs render as an em-dash so prompts predating the snapshot
 * machinery still render cleanly in tables.
 */
export function AccuracyCell({
  value,
  sample,
}: {
  value: number | null | undefined;
  sample?: number | null;
}) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-gray-400">—</span>;
  }
  const pct = Math.max(0, Math.min(1, value));
  const color = pct >= 0.95 ? 'bg-green-500' : pct >= 0.8 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-800 tabular-nums">{(pct * 100).toFixed(1)}%</span>
      <div className="h-1.5 w-16 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      {sample != null && sample > 0 && (
        <span className="text-[10px] text-gray-500">n={sample}</span>
      )}
    </div>
  );
}

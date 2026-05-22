import { Badge, type BadgeTone } from '@/components/ui';
import type {
  CalibrationStatus,
  HumanVerdict,
  JudgeBaselineExpected,
  PromptStatus,
  RoutingDecision,
} from '@/lib/catalog-feed-client';

/**
 * Presentation helpers for the calibrated-confidence pages. Every reviewer
 * surface (runs, prompts, calibrations, thresholds) renders a small set of
 * categorical statuses; this module maps each domain status to a tone in the
 * shared `Badge` primitive so the visual language matches the rest of the app.
 */

const DECISION_TONE: Record<RoutingDecision, BadgeTone> = {
  auto_ship: 'success',
  spot_check: 'warning',
  hold_for_review: 'danger',
};

const DECISION_LABELS: Record<RoutingDecision, string> = {
  auto_ship: 'Auto-ship',
  spot_check: 'Spot-check',
  hold_for_review: 'Hold',
};

export function DecisionBadge({ decision }: { decision: RoutingDecision }) {
  return (
    <Badge tone={DECISION_TONE[decision]} variant="soft">
      {DECISION_LABELS[decision]}
    </Badge>
  );
}

const VERDICT_TONE: Record<HumanVerdict, BadgeTone> = {
  accept: 'success',
  reject: 'danger',
};

const VERDICT_LABELS: Record<HumanVerdict, string> = {
  accept: 'Pass',
  reject: 'Fail',
};

export function VerdictBadge({ verdict }: { verdict: HumanVerdict }) {
  return (
    <Badge tone={VERDICT_TONE[verdict]} variant="soft">
      {VERDICT_LABELS[verdict]}
    </Badge>
  );
}

const PROMPT_STATUS_TONE: Record<PromptStatus, BadgeTone> = {
  proposed: 'info',
  active: 'success',
  retired: 'neutral',
};

export function PromptStatusBadge({ status }: { status: PromptStatus }) {
  return (
    <Badge tone={PROMPT_STATUS_TONE[status]} variant="soft">
      {status}
    </Badge>
  );
}

const CALIBRATION_STATUS_TONE: Record<CalibrationStatus, BadgeTone> = {
  active: 'success',
  retired: 'neutral',
};

export function CalibrationStatusBadge({ status }: { status: CalibrationStatus }) {
  return (
    <Badge tone={CALIBRATION_STATUS_TONE[status]} variant="soft">
      {status}
    </Badge>
  );
}

/**
 * ScoreCell renders a 0..1 confidence score as "0.000" right-aligned, with a
 * thin coloured bar that makes it scannable at a glance. `null` scores render
 * as an em-dash.
 */
export function ScoreCell({ value }: { value: number | null | undefined }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-text-disabled">—</span>;
  }
  const pct = Math.max(0, Math.min(1, value));
  const color = pct >= 0.95 ? 'bg-success-500' : pct >= 0.7 ? 'bg-warning-500' : 'bg-danger-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-body text-text-primary tabular-nums">{value.toFixed(3)}</span>
      <div className="rounded-pill bg-surface-sunken h-1.5 w-16">
        <div className={`rounded-pill h-1.5 ${color}`} style={{ width: `${pct * 100}%` }} />
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
 * StatusBadge surfaces the run's lifecycle state (succeeded, failed, etc.) on
 * the runs list. Today the queue mostly produces `succeeded` or `failed`; we
 * render anything else as a neutral "in progress" affordance so transient
 * states don't render as plain text.
 */
const STATUS_TONE: Record<string, BadgeTone> = {
  succeeded: 'success',
  failed: 'danger',
};

export function StatusBadge({ status }: { status: string }) {
  const tone: BadgeTone = STATUS_TONE[status] ?? 'info';
  return (
    <Badge tone={tone} variant="soft">
      {status || 'pending'}
    </Badge>
  );
}

// ─── Judge baselines ────────────────────────────────────────────────────────

const BASELINE_EXPECTED_TONE: Record<JudgeBaselineExpected, BadgeTone> = {
  pass: 'success',
  fail: 'danger',
};

export function BaselineExpectedBadge({ expected }: { expected: JudgeBaselineExpected }) {
  return (
    <Badge tone={BASELINE_EXPECTED_TONE[expected]} variant="soft" size="sm">
      {expected === 'pass' ? 'Should pass' : 'Should fail'}
    </Badge>
  );
}

/**
 * BaselineMatchBadge renders the per-run "did the judge agree with the gold
 * label" outcome.
 *
 *   - true  → match (success)
 *   - false → mismatch (danger)
 *   - null  → unlabeled product (em-dash)
 *
 * Optional `expected` and `observedPass` are rendered as caption metadata so
 * reviewers can see the gold label and the observed verdict in one cluster
 * without crowding the cell.
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
      <span
        className="text-text-disabled text-[11px]"
        title="Product is not in the labeled baseline."
      >
        —
      </span>
    );
  }
  const tone: BadgeTone = match ? 'success' : 'danger';
  const label = match ? 'Match' : 'Mismatch';
  const obs =
    observedPass == null ? null : (
      <span className="text-text-muted text-[10px]">obs={observedPass ? 'pass' : 'fail'}</span>
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={tone} variant="soft" size="sm">
        {label}
      </Badge>
      {expected && <span className="text-text-muted text-[10px]">exp={expected}</span>}
      {obs}
    </span>
  );
}

/**
 * AccuracyCell renders a 0..1 rate (e.g. baseline pass/fail rate) with a thin
 * coloured bar. Mirrors `ScoreCell` visually but uses percent-formatted text.
 */
export function AccuracyCell({
  value,
  sample,
}: {
  value: number | null | undefined;
  sample?: number | null;
}) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-text-disabled">—</span>;
  }
  const pct = Math.max(0, Math.min(1, value));
  const color = pct >= 0.95 ? 'bg-success-500' : pct >= 0.8 ? 'bg-warning-500' : 'bg-danger-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-body text-text-primary tabular-nums">{(pct * 100).toFixed(1)}%</span>
      <div className="rounded-pill bg-surface-sunken h-1.5 w-16">
        <div className={`rounded-pill h-1.5 ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      {sample != null && sample > 0 && (
        <span className="text-text-muted text-[10px]">n={sample}</span>
      )}
    </div>
  );
}

import { Badge, type BadgeSize, type BadgeTone } from '@/components/ui';
import type { DollhouseRenderStatus } from '@/lib/dollhouse-renders';

const STATUS_TONE: Record<DollhouseRenderStatus, BadgeTone> = {
  pending: 'info',
  posted: 'accent',
  completed: 'success',
  failed: 'danger',
};

const STATUS_LABEL: Record<DollhouseRenderStatus, string> = {
  pending: 'Pending',
  posted: 'Posted',
  completed: 'Completed',
  failed: 'Failed',
};

/** Returns true when `value` is one of the known DollhouseRenderStatus literals. */
export function isDollhouseRenderStatus(value: unknown): value is DollhouseRenderStatus {
  return value === 'pending' || value === 'posted' || value === 'completed' || value === 'failed';
}

/**
 * Status pill for a dollhouse render. Accepts a raw upstream `status` string —
 * unknown values fall back to a neutral tone with the raw text, so a future
 * server-side status doesn't crash the UI before this component is updated.
 */
export function RenderStatusBadge({ status, size = 'md' }: { status: string; size?: BadgeSize }) {
  if (isDollhouseRenderStatus(status)) {
    return (
      <Badge tone={STATUS_TONE[status]} variant="soft" size={size}>
        {STATUS_LABEL[status]}
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" variant="soft" size={size}>
      {status || 'Unknown'}
    </Badge>
  );
}

'use client';

import { Badge } from '@/components/ui';
import type { RunRow } from './batch-types';

export function deriveRunReviewStatus(run: RunRow): string {
  if (run.status === 'running' || run.status === 'pending') return 'running';
  if (run.totalGenerations === 0) return 'pending';
  if (run.ratedGenerations === 0) return 'pending';
  if (run.ratedGenerations >= run.totalGenerations) return 'reviewed';
  return 'in_progress';
}

const REVIEW_STATUS_CONFIG: Record<
  string,
  { tone: 'info' | 'neutral' | 'warning' | 'success'; label: string }
> = {
  running: { tone: 'info', label: 'Running' },
  pending: { tone: 'neutral', label: 'Pending' },
  in_progress: { tone: 'warning', label: 'In Progress' },
  reviewed: { tone: 'success', label: 'Reviewed' },
};

export function ReviewStatusBadge({ status }: { status: string }) {
  const c = REVIEW_STATUS_CONFIG[status] ?? REVIEW_STATUS_CONFIG.pending;
  return (
    <Badge tone={c.tone} variant="soft">
      {c.label}
    </Badge>
  );
}

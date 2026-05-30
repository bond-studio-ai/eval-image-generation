'use client';

import { Badge } from '@/components/ui';

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

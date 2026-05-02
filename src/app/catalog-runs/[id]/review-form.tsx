'use client';

import { HumanReviewForm } from '../human-review-form';

interface Props {
  runId: string;
}

/**
 * Detail-page wrapper around the shared review form (notes + Pass/Fail in one POST).
 */
export function ReviewForm({ runId }: Props) {
  return <HumanReviewForm runId={runId} />;
}

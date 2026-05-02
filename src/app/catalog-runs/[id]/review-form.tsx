'use client';

import { HumanReviewForm } from '../human-review-form';

interface Props {
  runId: string;
}

/**
 * Detail-page wrapper around the shared Pass/Fail + debounced-notes flow.
 */
export function ReviewForm({ runId }: Props) {
  return <HumanReviewForm runId={runId} />;
}

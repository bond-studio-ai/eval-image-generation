'use client';

import { CollapsibleDrift } from '../drift';
import type { DriftAssessment } from '../types';
import type { PluginRendererProps } from './index';

/**
 * Segmentation drift plugin renderer. Wraps the existing
 * `CollapsibleDrift` (the SAM-vs-dollhouse comparison cards) so the
 * modal's plugin loop can render the drift section with no special
 * casing. The renderer keeps consuming the same `DriftAssessment`
 * shape — it now lives at `reviewAssessment.plugins.segmentationDrift`
 * instead of `record.driftAssessment`, but the inside hasn't moved.
 */
export function SegmentationDriftRenderer({ assessment, lookup, categories }: PluginRendererProps) {
  const drift = (assessment as DriftAssessment | null | undefined) ?? null;
  return <CollapsibleDrift assessment={drift} status="computed" lookup={lookup} categories={categories} />;
}

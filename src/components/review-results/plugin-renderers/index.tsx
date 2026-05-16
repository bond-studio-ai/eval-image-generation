'use client';

import type { SegmentationCategoryMetadata } from '@/lib/segmentation-categories';
import type { JSX } from 'react';
import type { CategoryLookup, ReviewAssessment } from '../types';
import { DepthDriftRenderer } from './depth-drift';
import { SegmentationDriftRenderer } from './segmentation-drift';

/**
 * Context every plugin renderer receives. Mirrors what the orchestrator
 * passes to its plugins on the service side: enough metadata to label
 * categories (`categories`, `lookup`) plus the plugin-keyed envelope
 * the renderer pulls its payload out of.
 */
export interface PluginRendererProps {
  /** Plugin payload taken from `reviewAssessment.plugins[plugin.id]`.
   *  Renderers are responsible for narrowing this `unknown` to their
   *  own typed shape. */
  assessment: unknown;
  lookup: CategoryLookup;
  categories: SegmentationCategoryMetadata[] | null;
}

/**
 * Single registry entry. The modal iterates this list, looks each `id`
 * up in `reviewAssessment.plugins`, and renders the matching component
 * (or skips if the plugin produced nothing). New plugins ship a
 * renderer + an entry here; no changes to the modal itself.
 */
export interface PluginRenderer {
  id: string;
  /** Section title shown above each plugin's card stack. */
  title: string;
  Renderer: (props: PluginRendererProps) => JSX.Element;
}

/**
 * Ordered list of plugin renderers. Order is the rendering order in
 * the modal; keep it stable so reviewers can scan the same sections
 * in the same place across runs.
 */
export const PLUGIN_RENDERERS: readonly PluginRenderer[] = [
  { id: 'segmentationDrift', title: 'Segmentation drift', Renderer: SegmentationDriftRenderer },
  { id: 'depthDrift', title: 'Depth drift', Renderer: DepthDriftRenderer },
];

/**
 * Project the persisted envelope down to the (renderer, payload) pairs
 * the modal renders. Renderers without any matching plugin payload
 * are dropped so the modal doesn't render empty headers.
 */
export function pluginEntriesFor(
  reviewAssessment: ReviewAssessment | null | undefined,
): Array<{ renderer: PluginRenderer; assessment: unknown }> {
  if (!reviewAssessment?.plugins) return [];
  const entries: Array<{ renderer: PluginRenderer; assessment: unknown }> = [];
  for (const renderer of PLUGIN_RENDERERS) {
    const assessment = reviewAssessment.plugins[renderer.id];
    if (assessment === undefined || assessment === null) continue;
    entries.push({ renderer, assessment });
  }
  return entries;
}

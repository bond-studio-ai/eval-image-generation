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
const PLUGIN_RENDERERS: readonly PluginRenderer[] = [
  { id: 'segmentationDrift', title: 'Segmentation drift', Renderer: SegmentationDriftRenderer },
  { id: 'depthDrift', title: 'Depth drift', Renderer: DepthDriftRenderer },
];

/**
 * Project the persisted envelope down to the (renderer, payload) pairs
 * the modal renders.
 *
 * - `undefined` (key absent): plugin didn't run for this row → skip.
 * - `null`: plugin ran but couldn't produce a useful assessment
 *   (e.g. `status: 'no_dollhouse_view'`). Keep the entry so the
 *   renderer can display an "unavailable" placeholder instead of
 *   silently vanishing — reviewers need to see *that* the plugin
 *   was attempted to distinguish "not run" from "ran but unavailable".
 *
 * Renderers are responsible for handling a `null` assessment
 * gracefully (the shipped `SegmentationDriftRenderer` and
 * `DepthDriftRenderer` both render an unavailable card in that case).
 */
export function pluginEntriesFor(
  reviewAssessment: ReviewAssessment | null | undefined,
): Array<{ renderer: PluginRenderer; assessment: unknown }> {
  if (!reviewAssessment?.plugins) return [];
  const entries: Array<{ renderer: PluginRenderer; assessment: unknown }> = [];
  for (const renderer of PLUGIN_RENDERERS) {
    if (!(renderer.id in reviewAssessment.plugins)) continue;
    const assessment = reviewAssessment.plugins[renderer.id];
    entries.push({ renderer, assessment });
  }
  return entries;
}

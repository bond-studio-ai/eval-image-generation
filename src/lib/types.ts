/** Shared types used across both server and client components. */

export interface PromptVersionListItem {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  stats?: { generationCount: number };
}

/**
 * Discriminator on the strategy-run create request. Determines what
 * image-generation does with the request context:
 *   - `dollhouse` (+ room_data + design_materials) triggers the
 *     dollhouse capture step before generation.
 *   - `photo` (+ project_id) hydrates the run from the project's user
 *     photos (real_photo + arbitrary_images).
 *   - `pdp` targets product-detail-page strategies that consume
 *     caller-supplied arbitrary images via the PDP runs endpoint.
 */
export type StrategyRunSource = 'dollhouse' | 'photo' | 'pdp';

export interface StrategyListItem {
  id: string;
  name: string;
  description: string | null;
  /**
   * Which run source this strategy is active for, if any. A given
   * source can have at most one active strategy at a time, but the
   * same strategy can only be active for one source at a time.
   */
  activeForSource: StrategyRunSource | null;
  /** Derived from `activeForSource`: true when active for any source. */
  isActive: boolean;
  createdAt: string;
  stepCount: number;
  runCount: number;
}

export interface InputPresetListItem {
  id: string;
  name: string | null;
  description: string | null;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  createdAt: string;
  imageCount: number;
  stats?: { generationCount: number };
}

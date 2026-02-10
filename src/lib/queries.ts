import { db } from '@/db';
import { generation, imageSelection, promptVersion } from '@/db/schema';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';

// ------------------------------------
// Prompt Versions
// ------------------------------------

export interface PromptVersionListItem {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  model: string | null;
  aspectRatio: string | null;
  outputResolution: string | null;
  temperature: string | null;
  stats?: {
    generation_count: number;
  };
}

export interface PromptVersionDetail {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  description: string | null;
  model: string | null;
  aspectRatio: string | null;
  outputResolution: string | null;
  temperature: string | null;
  stats?: {
    generation_count: number;
  };
}

/**
 * Fetch prompt versions list with generation counts.
 * Replicates the logic from GET /api/v1/prompt-versions.
 */
export async function fetchPromptVersions(limit = 100): Promise<PromptVersionListItem[]> {
  const rows = await db
    .select()
    .from(promptVersion)
    .where(isNull(promptVersion.deletedAt))
    .orderBy(desc(promptVersion.createdAt))
    .limit(limit);

  return Promise.all(
    rows.map(async (pv) => {
      const stats = await db
        .select({ count: count() })
        .from(generation)
        .where(eq(generation.promptVersionId, pv.id));

      return {
        id: pv.id,
        name: pv.name,
        systemPrompt: pv.systemPrompt,
        userPrompt: pv.userPrompt,
        model: pv.model,
        aspectRatio: pv.aspectRatio,
        outputResolution: pv.outputResolution,
        temperature: pv.temperature,
        stats: {
          generation_count: stats[0]?.count ?? 0,
        },
      };
    }),
  );
}

/**
 * Fetch a single prompt version by ID with stats.
 * Replicates the logic from GET /api/v1/prompt-versions/[id].
 */
export async function fetchPromptVersionById(id: string): Promise<PromptVersionDetail | null> {
  const result = await db.query.promptVersion.findFirst({
    where: eq(promptVersion.id, id),
    with: {
      generations: {
        columns: { id: true, sceneAccuracyRating: true, productAccuracyRating: true },
      },
    },
  });

  if (!result) return null;

  const { generations, ...pvData } = result;

  return {
    id: pvData.id,
    name: pvData.name,
    systemPrompt: pvData.systemPrompt,
    userPrompt: pvData.userPrompt,
    description: pvData.description,
    model: pvData.model,
    aspectRatio: pvData.aspectRatio,
    outputResolution: pvData.outputResolution,
    temperature: pvData.temperature,
    stats: {
      generation_count: generations.length,
    },
  };
}

// ------------------------------------
// Image Selections
// ------------------------------------

export type ImageSelectionRow = typeof imageSelection.$inferSelect;

/**
 * Fetch the image selection for a specific user.
 */
export async function fetchImageSelectionByUser(userId: string): Promise<ImageSelectionRow | null> {
  const rows = await db
    .select()
    .from(imageSelection)
    .where(eq(imageSelection.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

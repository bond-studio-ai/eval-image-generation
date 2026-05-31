/** A generation row as rendered in the generations list/table. */
export interface GenerationRow {
  id: string;
  promptVersionId: string;
  promptName: string | null;
  sceneAccuracyRating: string | null;
  productAccuracyRating: string | null;
  notes: string | null;
  executionTime: number | null;
  createdAt: string;
  resultUrls: string[];
  resultCount: number;
}

interface RawGenerationRow {
  id?: unknown;
  promptVersionId?: unknown;
  promptName?: unknown;
  sceneAccuracyRating?: unknown;
  productAccuracyRating?: unknown;
  notes?: unknown;
  executionTime?: unknown;
  createdAt?: unknown;
  resultUrls?: unknown;
  resultCount?: unknown;
}

/** Normalize one raw generation row from the API into a typed `GenerationRow`. */
export function normalizeGenerationRow(entry: unknown): GenerationRow {
  const row = (entry ?? {}) as RawGenerationRow;
  return {
    id: row.id as string,
    promptVersionId: row.promptVersionId as string,
    promptName: (row.promptName ?? null) as string | null,
    sceneAccuracyRating: (row.sceneAccuracyRating ?? null) as string | null,
    productAccuracyRating: (row.productAccuracyRating ?? null) as string | null,
    notes: (row.notes ?? null) as string | null,
    executionTime: (row.executionTime ?? null) as number | null,
    createdAt: row.createdAt as string,
    resultUrls: (row.resultUrls ?? []) as string[],
    resultCount: (row.resultCount ?? 0) as number
  };
}

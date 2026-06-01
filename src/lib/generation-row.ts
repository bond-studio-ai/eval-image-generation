import { z } from "zod";

/**
 * A generation row as rendered in the generations list/table.
 *
 * Parsed leniently: each field falls back to a sensible default rather than
 * throwing, so a single malformed field never drops the whole row.
 */
const generationRowSchema = z.object({
  id: z.string().catch(""),
  promptVersionId: z.string().catch(""),
  promptName: z.string().nullable().catch(null),
  sceneAccuracyRating: z.string().nullable().catch(null),
  productAccuracyRating: z.string().nullable().catch(null),
  notes: z.string().nullable().catch(null),
  executionTime: z.number().nullable().catch(null),
  createdAt: z.string().catch(""),
  resultUrls: z.array(z.string()).catch([]),
  resultCount: z.number().catch(0)
});

export type GenerationRow = z.infer<typeof generationRowSchema>;

/** Normalize one raw generation row from the API into a typed `GenerationRow`. */
export function normalizeGenerationRow(entry: unknown): GenerationRow {
  return generationRowSchema.parse(entry && typeof entry === "object" ? entry : {});
}

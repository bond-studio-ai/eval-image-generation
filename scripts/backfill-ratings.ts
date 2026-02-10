/**
 * CLI script to backfill scene_accuracy_rating and product_accuracy_rating
 * on generations from their output image evaluations.
 *
 * Run from project root:
 *   yarn backfill-ratings
 *   npm run backfill-ratings
 *   npx tsx scripts/backfill-ratings.ts
 *
 * Loads DATABASE_URL from .env when present.
 */

import 'dotenv/config';

import { db } from '../src/db';
import { generation } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Set it in .env or the environment.');
    process.exit(1);
  }

  const generations = await db.query.generation.findMany({
    with: {
      results: {
        with: {
          evaluation: true,
        },
      },
    },
  });

  let sceneUpdated = 0;
  let productUpdated = 0;

  for (const gen of generations) {
    const evals = gen.results
      .map((r) => r.evaluation)
      .filter((e): e is NonNullable<typeof e> => e != null);

    const updates: {
      sceneAccuracyRating?: 'FAILED' | 'GOOD';
      productAccuracyRating?: 'FAILED' | 'GOOD';
    } = {};

    if (evals.length > 0) {
      const hasSceneIssues = evals.some((e) => {
        const issues = e.sceneAccuracyIssues
          ? (JSON.parse(e.sceneAccuracyIssues) as string[])
          : [];
        const notes = (e.sceneAccuracyNotes ?? '').trim();
        return issues.length > 0 || notes.length > 0;
      });
      updates.sceneAccuracyRating = hasSceneIssues ? 'FAILED' : 'GOOD';

      const hasProductIssues = evals.some((e) => {
        if (!e.productAccuracy) return false;
        const pa = JSON.parse(e.productAccuracy) as Record<
          string,
          { issues?: string[]; notes?: string }
        >;
        return Object.values(pa).some(
          (cat) =>
            (cat?.issues?.length ?? 0) > 0 ||
            ((cat?.notes ?? '').trim().length ?? 0) > 0,
        );
      });
      updates.productAccuracyRating = hasProductIssues ? 'FAILED' : 'GOOD';
    } else {
      // No output or no evaluations: mark as GOOD (no issues flagged)
      updates.sceneAccuracyRating = 'GOOD';
      updates.productAccuracyRating = 'GOOD';
    }

    await db.update(generation).set(updates).where(eq(generation.id, gen.id));
    sceneUpdated++;
    productUpdated++;
  }

  console.log('Backfill complete.');
  console.log('  Generations checked:', generations.length);
  console.log('  Scene accuracy updated:', sceneUpdated);
  console.log('  Product accuracy updated:', productUpdated);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

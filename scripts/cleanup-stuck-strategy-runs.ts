/**
 * Clean up strategy runs in a bad state:
 * 1. Stuck runs: status "running" or "pending" → mark as failed.
 * 2. Orphan runs: runs with 0 step results (show as "Steps 0/0") → backfill missing step results
 *    so the run has one row per strategy step (status 'failed', error "Never executed"). If the
 *    strategy has no steps or was deleted, the run is deleted.
 *
 * Usage:
 *   npx tsx scripts/cleanup-stuck-strategy-runs.ts              # fix stuck + backfill orphans
 *   npx tsx scripts/cleanup-stuck-strategy-runs.ts --dry-run   # only print what would be fixed
 *   npx tsx scripts/cleanup-stuck-strategy-runs.ts --older-than-minutes=30  # only runs stuck > 30 min
 *   npx tsx scripts/cleanup-stuck-strategy-runs.ts --skip-orphans   # only fix stuck, don't touch 0-step runs
 *   npx tsx scripts/cleanup-stuck-strategy-runs.ts --delete-orphans  # delete orphan runs instead of backfilling
 *   npx tsx scripts/cleanup-stuck-strategy-runs.ts --remove-backfilled  # delete runs that were backfilled (all steps have backfill error)
 *
 * Requires PGHOST, PGUSER, PGPASSWORD, PGDATABASE in .env.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { getConnectionUrl } from '../src/lib/db/connection';

const ORPHAN_STEP_ERROR = 'Never executed (run had no step results; backfilled by cleanup).';

function parseArgs(): {
  dryRun: boolean;
  olderThanMinutes: number;
  skipOrphans: boolean;
  deleteOrphans: boolean;
  removeBackfilled: boolean;
} {
  const args = process.argv.slice(2);
  let dryRun = false;
  let olderThanMinutes = 0;
  let skipOrphans = false;
  let deleteOrphans = false;
  let removeBackfilled = false;
  for (const a of args) {
    if (a === '--dry-run') dryRun = true;
    else if (a === '--skip-orphans') skipOrphans = true;
    else if (a === '--delete-orphans') deleteOrphans = true;
    else if (a === '--remove-backfilled') removeBackfilled = true;
    else if (a.startsWith('--older-than-minutes=')) {
      olderThanMinutes = Math.max(0, parseInt(a.split('=')[1] ?? '0', 10));
    }
  }
  return { dryRun, olderThanMinutes, skipOrphans, deleteOrphans, removeBackfilled };
}

async function main() {
  let databaseUrl: string;
  try {
    databaseUrl = getConnectionUrl();
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  const { dryRun, olderThanMinutes, skipOrphans, deleteOrphans, removeBackfilled } = parseArgs();
  if (dryRun) console.log('DRY RUN — no changes will be made.\n');

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    // ---- 0. Remove backfilled runs (all step results have the backfill error) ----
    if (removeBackfilled) {
      const backfilledRes = await client.query(
        `SELECT r.id FROM strategy_run r
         WHERE EXISTS (SELECT 1 FROM strategy_step_result s WHERE s.strategy_run_id = r.id)
         AND NOT EXISTS (
           SELECT 1 FROM strategy_step_result s
           WHERE s.strategy_run_id = r.id
           AND (s.error IS NULL OR s.error <> $1)
         )`,
        [ORPHAN_STEP_ERROR]
      );
      const backfilledRuns = (backfilledRes.rows as { id: string }[]).map((r) => r.id);
      if (backfilledRuns.length === 0) {
        console.log('No backfilled runs found.');
      } else {
        console.log(`Found ${backfilledRuns.length} backfilled run(s) to remove:`);
        for (const id of backfilledRuns) console.log(`  - ${id}`);
        if (!dryRun) {
          for (const id of backfilledRuns) {
            await client.query(`DELETE FROM strategy_run WHERE id = $1`, [id]);
            console.log(`  Deleted run ${id}`);
          }
          console.log('Done.');
        } else {
          console.log('\nWould delete these runs.');
        }
      }
      return;
    }

    const olderClause =
      olderThanMinutes > 0
        ? `AND r.created_at < NOW() - INTERVAL '${olderThanMinutes} minutes'`
        : '';

    // ---- 1. Stuck runs (running/pending) ----
    const stuckRes = await client.query(
      `SELECT r.id, r.strategy_id, r.status, r.created_at
       FROM strategy_run r
       WHERE r.status IN ('running', 'pending')
       ${olderClause}
       ORDER BY r.created_at ASC`
    );
    const stuckRuns = stuckRes.rows as { id: string; strategy_id: string; status: string; created_at: string }[];

    if (stuckRuns.length > 0) {
      console.log(`Found ${stuckRuns.length} stuck run(s) (status running/pending):`);
      for (const r of stuckRuns) {
        console.log(`  - ${r.id} (strategy ${r.strategy_id}) status=${r.status} created=${r.created_at}`);
      }
      if (!dryRun) {
        for (const run of stuckRuns) {
          await client.query(
            `UPDATE strategy_step_result
             SET status = 'failed', error = COALESCE(error, 'Run stuck; cleaned up.')
             WHERE strategy_run_id = $1 AND status IN ('running', 'pending')`,
            [run.id]
          );
          await client.query(
            `UPDATE strategy_run SET status = 'failed', completed_at = NOW() WHERE id = $1`,
            [run.id]
          );
          console.log(`  Fixed run ${run.id}`);
        }
      } else {
        console.log('  Would mark these runs as failed.');
      }
      console.log('');
    } else {
      console.log('No stuck runs (running/pending) found.\n');
    }

    // ---- 2. Orphan runs (0 step results — show as Steps 0/0) ----
    if (skipOrphans) {
      console.log('Skipping orphan runs (--skip-orphans).');
      return;
    }

    const orphanRes = await client.query(
      `SELECT r.id, r.strategy_id, r.status, r.created_at
       FROM strategy_run r
       WHERE NOT EXISTS (
         SELECT 1 FROM strategy_step_result s WHERE s.strategy_run_id = r.id
       )
       ORDER BY r.created_at ASC`
    );
    const orphanRuns = orphanRes.rows as { id: string; strategy_id: string; status: string; created_at: string }[];

    if (orphanRuns.length === 0) {
      console.log('No orphan runs (0 steps) found.');
      return;
    }

    console.log(`Found ${orphanRuns.length} orphan run(s) (0 step results, show as Steps 0/0):`);
    for (const r of orphanRuns) {
      console.log(`  - ${r.id} (strategy ${r.strategy_id}) status=${r.status} created=${r.created_at}`);
    }

    if (dryRun) {
      if (deleteOrphans) {
        console.log('\nWould delete these runs.');
      } else {
        console.log('\nWould backfill missing step results (one failed step result per strategy step) so runs show correct step count.');
      }
      return;
    }

    for (const run of orphanRuns) {
      if (deleteOrphans) {
        await client.query(`DELETE FROM strategy_run WHERE id = $1`, [run.id]);
        console.log(`  Deleted orphan run ${run.id}`);
        continue;
      }

      const stepsRes = await client.query(
        `SELECT id FROM strategy_step WHERE strategy_id = $1 ORDER BY step_order ASC`,
        [run.strategy_id]
      );
      const steps = stepsRes.rows as { id: string }[];

      if (steps.length === 0) {
        await client.query(`DELETE FROM strategy_run WHERE id = $1`, [run.id]);
        console.log(`  Run ${run.id}: strategy has no steps, deleted run.`);
        continue;
      }

      for (const step of steps) {
        await client.query(
          `INSERT INTO strategy_step_result (strategy_run_id, strategy_step_id, status, error)
           VALUES ($1, $2, 'failed', $3)`,
          [run.id, step.id, ORPHAN_STEP_ERROR]
        );
      }
      console.log(`  Backfilled run ${run.id}: ${steps.length} step result(s) (failed).`);
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

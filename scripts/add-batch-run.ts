import 'dotenv/config';
import { Pool } from 'pg';
import { getConnectionUrl } from '../src/lib/db/connection';

const pool = new Pool({ connectionString: getConnectionUrl() });

async function main() {
  const client = await pool.connect();
  try {
    console.log('Creating strategy_batch_run table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS strategy_batch_run (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        strategy_id uuid NOT NULL REFERENCES strategy(id) ON DELETE CASCADE,
        execution_count integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_strategy_batch_run_strategy ON strategy_batch_run(strategy_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_strategy_batch_run_created_at ON strategy_batch_run(created_at)`);

    console.log('Adding batch_run_id column to strategy_run...');
    await client.query(`
      ALTER TABLE strategy_run
      ADD COLUMN IF NOT EXISTS batch_run_id uuid REFERENCES strategy_batch_run(id) ON DELETE SET NULL;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_strategy_run_batch ON strategy_run(batch_run_id)`);

    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

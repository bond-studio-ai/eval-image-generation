/**
 * One-off: drop model/output_type/aspect_ratio/output_resolution/temperature from prompt_version.
 * Run: npx tsx scripts/drop-prompt-version-settings.ts
 * Requires PGHOST, PGUSER, PGPASSWORD, PGDATABASE in .env.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { getConnectionUrl } from '../src/lib/db/connection';

async function main() {
  let databaseUrl: string;
  try {
    databaseUrl = getConnectionUrl();
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    const columns = ['model', 'output_type', 'aspect_ratio', 'output_resolution', 'temperature'];
    for (const col of columns) {
      try {
        await client.query(`ALTER TABLE prompt_version DROP COLUMN IF EXISTS "${col}"`);
        console.log(`Dropped prompt_version.${col}`);
      } catch (err) {
        console.warn(`Column ${col}:`, (err as Error).message);
      }
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

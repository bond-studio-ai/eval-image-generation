/**
 * One-off: drop model/output_type/aspect_ratio/output_resolution/temperature from prompt_version.
 * Run: npx tsx scripts/drop-prompt-version-settings.ts
 * Requires DATABASE_URL in .env.
 */

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
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

/**
 * One-off: convert product image columns from text to text[] in
 * generation_input, input_preset, and image_selection.
 * Run: npx tsx scripts/migrate-product-arrays.ts
 * Requires DATABASE_URL in .env.
 */

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

const PRODUCT_COLUMNS = [
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robe_hooks',
  'shelves', 'shower_glasses', 'shower_systems', 'floor_tiles', 'wall_tiles',
  'shower_wall_tiles', 'shower_floor_tiles', 'shower_curb_tiles',
  'toilet_paper_holders', 'toilets', 'towel_bars', 'towel_rings',
  'tub_doors', 'tub_fillers', 'tubs', 'vanities', 'wallpapers',
];

const TABLES = ['generation_input', 'input_preset', 'image_selection'];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    for (const table of TABLES) {
      console.log(`\n=== ${table} ===`);
      for (const col of PRODUCT_COLUMNS) {
        try {
          await client.query(`
            ALTER TABLE "${table}"
            ALTER COLUMN "${col}" TYPE text[]
            USING CASE
              WHEN "${col}" IS NULL THEN '{}'::text[]
              ELSE ARRAY["${col}"]::text[]
            END
          `);
          console.log(`  ${col}: converted to text[]`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('already') || msg.includes('text[]')) {
            console.log(`  ${col}: already text[]`);
          } else {
            console.error(`  ${col}: ERROR - ${msg}`);
          }
        }

        try {
          await client.query(`
            ALTER TABLE "${table}"
            ALTER COLUMN "${col}" SET DEFAULT '{}'::text[]
          `);
        } catch {
          // ignore
        }
      }
    }

    console.log('\nDone.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

/**
 * One-off: add arbitrary_images to input_preset (and related 0009 changes).
 * Run: npx tsx scripts/migrate-arbitrary-images.ts
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
    console.log('Adding arbitrary_images column if not exists...');
    await client.query(`
      ALTER TABLE "input_preset"
      ADD COLUMN IF NOT EXISTS "arbitrary_images" jsonb NOT NULL DEFAULT '[]'
    `);

    // Migrate data from old column if it exists (ignore errors if column was already dropped)
    try {
      await client.query(`
        UPDATE "input_preset"
        SET "arbitrary_images" = (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('url', e)), '[]'::jsonb)
          FROM jsonb_array_elements_text("arbitrary_image_urls") AS e
        )
        WHERE "arbitrary_image_urls" IS NOT NULL
          AND jsonb_typeof("arbitrary_image_urls") = 'array'
          AND jsonb_array_length("arbitrary_image_urls") > 0
      `);
      console.log('Migrated data from arbitrary_image_urls.');
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
      if (msg === '42703') {
        console.log('Column arbitrary_image_urls not present, skipping data migration.');
      } else {
        throw e;
      }
    }

    await client.query(`ALTER TABLE "input_preset" DROP COLUMN IF EXISTS "arbitrary_image_urls"`);
    await client.query(`ALTER TABLE "strategy_step" DROP COLUMN IF EXISTS "input_preset_id"`);

    console.log('Creating strategy_run_input_preset table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "strategy_run_input_preset" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "strategy_run_id" uuid NOT NULL REFERENCES "strategy_run"("id") ON DELETE CASCADE,
        "input_preset_id" uuid NOT NULL REFERENCES "input_preset"("id") ON DELETE CASCADE,
        "order" integer NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "idx_run_input_preset_run" ON "strategy_run_input_preset" ("strategy_run_id")`);

    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

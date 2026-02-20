-- Input preset: arbitrary images with optional tags (replace url-only array)
ALTER TABLE "input_preset"
  ADD COLUMN IF NOT EXISTS "arbitrary_images" jsonb NOT NULL DEFAULT '[]';

-- Migrate existing arbitrary_image_urls to arbitrary_images (each url as { "url": "<url>" })
UPDATE "input_preset"
SET "arbitrary_images" = (
  SELECT jsonb_agg(jsonb_build_object('url', e))
  FROM jsonb_array_elements_text("arbitrary_image_urls") AS e
)
WHERE "arbitrary_image_urls" IS NOT NULL
  AND jsonb_typeof("arbitrary_image_urls") = 'array'
  AND jsonb_array_length("arbitrary_image_urls") > 0;

ALTER TABLE "input_preset" DROP COLUMN IF EXISTS "arbitrary_image_urls";

-- Strategy step: remove input preset (presets are selected at run time)
ALTER TABLE "strategy_step" DROP COLUMN IF EXISTS "input_preset_id";

-- Run input presets: many-to-many with order
CREATE TABLE IF NOT EXISTS "strategy_run_input_preset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strategy_run_id" uuid NOT NULL REFERENCES "strategy_run"("id") ON DELETE CASCADE,
  "input_preset_id" uuid NOT NULL REFERENCES "input_preset"("id") ON DELETE CASCADE,
  "order" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_run_input_preset_run" ON "strategy_run_input_preset" ("strategy_run_id");

-- Strategy step: what to include from input preset, previous step as image, arbitrary images
ALTER TABLE "strategy_step"
  ADD COLUMN IF NOT EXISTS "include_dollhouse" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "include_real_photo" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "include_mood_board" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "include_product_categories" jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "arbitrary_image_from_step" integer,
  ADD COLUMN IF NOT EXISTS "arbitrary_image_urls" jsonb NOT NULL DEFAULT '[]';

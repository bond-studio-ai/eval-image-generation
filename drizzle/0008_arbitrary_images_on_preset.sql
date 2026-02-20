-- Arbitrary images on input preset (for both single generation and strategy steps)
ALTER TABLE "input_preset"
  ADD COLUMN IF NOT EXISTS "arbitrary_image_urls" jsonb NOT NULL DEFAULT '[]';

-- Remove from strategy_step (moved to preset)
ALTER TABLE "strategy_step"
  DROP COLUMN IF EXISTS "arbitrary_image_urls";

ALTER TABLE "strategy_step"
  ADD COLUMN IF NOT EXISTS "include_product_images" boolean NOT NULL DEFAULT true;

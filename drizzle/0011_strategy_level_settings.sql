-- Strategy-level model settings (used by all steps)
ALTER TABLE "strategy" ADD COLUMN IF NOT EXISTS "model" varchar(255) NOT NULL DEFAULT 'gemini-2.5-flash-image';
ALTER TABLE "strategy" ADD COLUMN IF NOT EXISTS "aspect_ratio" varchar(20) NOT NULL DEFAULT '1:1';
ALTER TABLE "strategy" ADD COLUMN IF NOT EXISTS "output_resolution" varchar(20) NOT NULL DEFAULT '1K';
ALTER TABLE "strategy" ADD COLUMN IF NOT EXISTS "temperature" decimal(3, 2) NOT NULL DEFAULT '1.00';
ALTER TABLE "strategy" ADD COLUMN IF NOT EXISTS "use_google_search" boolean NOT NULL DEFAULT false;
ALTER TABLE "strategy" ADD COLUMN IF NOT EXISTS "tag_images" boolean NOT NULL DEFAULT true;

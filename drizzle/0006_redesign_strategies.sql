-- Drop old strategy-related columns and indexes
ALTER TABLE "generation" DROP CONSTRAINT IF EXISTS "generation_strategy_id_strategy_id_fk";
DROP INDEX IF EXISTS "idx_generation_strategy";
ALTER TABLE "generation" DROP COLUMN IF EXISTS "strategy_id";

-- Drop old strategy indexes and columns
DROP INDEX IF EXISTS "idx_strategy_source_result";
ALTER TABLE "strategy" DROP CONSTRAINT IF EXISTS "strategy_source_result_id_generation_result_id_fk";
ALTER TABLE "strategy" DROP COLUMN IF EXISTS "source_result_id";

-- Create strategy_step table
CREATE TABLE IF NOT EXISTS "strategy_step" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strategy_id" uuid NOT NULL REFERENCES "strategy"("id") ON DELETE CASCADE,
  "step_order" integer NOT NULL,
  "prompt_version_id" uuid NOT NULL REFERENCES "prompt_version"("id") ON DELETE RESTRICT,
  "input_preset_id" uuid REFERENCES "input_preset"("id") ON DELETE SET NULL,
  "model" varchar(255) NOT NULL DEFAULT 'gemini-2.5-flash-image',
  "aspect_ratio" varchar(20) NOT NULL DEFAULT '1:1',
  "output_resolution" varchar(20) NOT NULL DEFAULT '1K',
  "temperature" numeric(3, 2),
  "use_google_search" boolean NOT NULL DEFAULT false,
  "tag_images" boolean NOT NULL DEFAULT true,
  "dollhouse_view_from_step" integer,
  "real_photo_from_step" integer,
  "mood_board_from_step" integer
);

CREATE INDEX IF NOT EXISTS "idx_strategy_step_strategy" ON "strategy_step" ("strategy_id");
ALTER TABLE "strategy_step" ADD CONSTRAINT "uq_strategy_step_order" UNIQUE ("strategy_id", "step_order");

-- Create strategy_run table
CREATE TABLE IF NOT EXISTS "strategy_run" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strategy_id" uuid NOT NULL REFERENCES "strategy"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_strategy_run_strategy" ON "strategy_run" ("strategy_id");
CREATE INDEX IF NOT EXISTS "idx_strategy_run_created_at" ON "strategy_run" ("created_at");

-- Create strategy_step_result table
CREATE TABLE IF NOT EXISTS "strategy_step_result" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "strategy_run_id" uuid NOT NULL REFERENCES "strategy_run"("id") ON DELETE CASCADE,
  "strategy_step_id" uuid NOT NULL REFERENCES "strategy_step"("id") ON DELETE CASCADE,
  "generation_id" uuid REFERENCES "generation"("id") ON DELETE SET NULL,
  "output_url" text,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "error" text,
  "execution_time" integer
);

CREATE INDEX IF NOT EXISTS "idx_step_result_run" ON "strategy_step_result" ("strategy_run_id");
CREATE INDEX IF NOT EXISTS "idx_step_result_step" ON "strategy_step_result" ("strategy_step_id");

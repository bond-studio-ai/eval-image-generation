-- Create strategy table
CREATE TABLE IF NOT EXISTS "strategy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "source_result_id" uuid NOT NULL REFERENCES "generation_result"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

-- Add strategy_id FK to generation table
ALTER TABLE "generation" ADD COLUMN IF NOT EXISTS "strategy_id" uuid;
ALTER TABLE "generation" ADD CONSTRAINT "generation_strategy_id_strategy_id_fk"
  FOREIGN KEY ("strategy_id") REFERENCES "strategy"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Indexes for strategy
CREATE INDEX IF NOT EXISTS "idx_strategy_created_at" ON "strategy" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_strategy_active" ON "strategy" ("created_at") WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "idx_strategy_source_result" ON "strategy" ("source_result_id");

-- Index for generation.strategy_id
CREATE INDEX IF NOT EXISTS "idx_generation_strategy" ON "generation" ("strategy_id");

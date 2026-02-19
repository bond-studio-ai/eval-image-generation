-- Create input_preset table
CREATE TABLE IF NOT EXISTS "input_preset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255),
  "description" text,
  "dollhouse_view" text,
  "real_photo" text,
  "mood_board" text,
  "faucets" text,
  "lightings" text,
  "lvps" text,
  "mirrors" text,
  "paints" text,
  "robe_hooks" text,
  "shelves" text,
  "shower_glasses" text,
  "shower_systems" text,
  "floor_tiles" text,
  "wall_tiles" text,
  "shower_wall_tiles" text,
  "shower_floor_tiles" text,
  "shower_curb_tiles" text,
  "toilet_paper_holders" text,
  "toilets" text,
  "towel_bars" text,
  "towel_rings" text,
  "tub_doors" text,
  "tub_fillers" text,
  "tubs" text,
  "vanities" text,
  "wallpapers" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

-- Add input_preset_id FK to generation table
ALTER TABLE "generation" ADD COLUMN IF NOT EXISTS "input_preset_id" uuid;
ALTER TABLE "generation" ADD CONSTRAINT "generation_input_preset_id_input_preset_id_fk"
  FOREIGN KEY ("input_preset_id") REFERENCES "input_preset"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Indexes for input_preset
CREATE INDEX IF NOT EXISTS "idx_input_preset_created_at" ON "input_preset" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_input_preset_active" ON "input_preset" ("created_at") WHERE deleted_at IS NULL;

-- Index for generation.input_preset_id
CREATE INDEX IF NOT EXISTS "idx_generation_input_preset" ON "generation" ("input_preset_id");

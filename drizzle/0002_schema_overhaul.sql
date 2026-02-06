-- Create generation_input table (one-to-one with generation, typed columns)
CREATE TABLE IF NOT EXISTS "generation_input" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "generation_id" uuid NOT NULL,
  "dollhouse_view" text,
  "real_photo" text,
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
  CONSTRAINT "uq_generation_input" UNIQUE("generation_id")
);

ALTER TABLE "generation_input"
  ADD CONSTRAINT "generation_input_generation_id_generation_id_fk"
  FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id")
  ON DELETE cascade ON UPDATE no action;

-- Create generation_result table (one-to-many with generation)
CREATE TABLE IF NOT EXISTS "generation_result" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "generation_id" uuid NOT NULL,
  "url" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_result_generation" ON "generation_result" USING btree ("generation_id");

ALTER TABLE "generation_result"
  ADD CONSTRAINT "generation_result_generation_id_generation_id_fk"
  FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id")
  ON DELETE cascade ON UPDATE no action;

-- Create result_evaluation table (one-to-one with generation_result)
CREATE TABLE IF NOT EXISTS "result_evaluation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "result_id" uuid NOT NULL,
  "product_accuracy" text,
  "scene_accuracy_issues" text,
  "scene_accuracy_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_result_evaluation" UNIQUE("result_id")
);

CREATE INDEX IF NOT EXISTS "idx_result_evaluation_result" ON "result_evaluation" USING btree ("result_id");

ALTER TABLE "result_evaluation"
  ADD CONSTRAINT "result_evaluation_result_id_generation_result_id_fk"
  FOREIGN KEY ("result_id") REFERENCES "public"."generation_result"("id")
  ON DELETE cascade ON UPDATE no action;

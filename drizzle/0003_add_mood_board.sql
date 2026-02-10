-- Add mood_board column to generation_input and image_selection (scene image columns)
ALTER TABLE "generation_input" ADD COLUMN IF NOT EXISTS "mood_board" text;
ALTER TABLE "image_selection" ADD COLUMN IF NOT EXISTS "mood_board" text;

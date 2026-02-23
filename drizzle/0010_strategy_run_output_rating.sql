-- Remove output_rating from strategy_run (reverted: rate generation result instead)
ALTER TABLE "strategy_run" DROP COLUMN IF EXISTS "output_rating";

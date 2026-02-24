-- Rename execution_count to number_of_images on strategy_batch_run.
ALTER TABLE "strategy_batch_run" RENAME COLUMN "execution_count" TO "number_of_images";

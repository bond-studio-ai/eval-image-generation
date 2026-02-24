-- Allow a batch to span multiple strategies (strategy_id null = multi-strategy batch from Executions Run).
ALTER TABLE "strategy_batch_run" ALTER COLUMN "strategy_id" DROP NOT NULL;

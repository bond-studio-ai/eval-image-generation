'use client';

import { StrategyRunsList } from './runs-list';

interface Run {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  lastOutputUrl?: string | null;
  lastOutputGenerationId?: string | null;
  batchRunId?: string | null;
  stepResults: { id: string; status: string }[];
}

export function StrategyRunsSection({
  strategyId,
  initialRuns,
}: {
  strategyId: string;
  initialRuns: Run[];
}) {
  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <StrategyRunsList strategyId={strategyId} initialRuns={initialRuns} />
    </div>
  );
}

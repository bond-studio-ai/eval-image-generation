"use client";

import { StrategyRunsList } from "./runs-list";

interface Run {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  lastOutputUrl?: string | null;
  lastOutputGenerationId?: string | null;
  batchRunId?: string | null;
  groupId?: string | null;
  stepResults: { id: string; status: string }[];
}

export function StrategyRunsSection({ strategyId, hasJudge, initialRuns }: { strategyId: string; hasJudge?: boolean; initialRuns: Run[] }) {
  return (
    <div className="border-border bg-surface mt-8 rounded-lg border p-6 shadow-xs">
      <StrategyRunsList strategyId={strategyId} hasJudge={hasJudge} initialRuns={initialRuns} />
    </div>
  );
}

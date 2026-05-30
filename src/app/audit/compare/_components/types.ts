import type { InputImage } from '@/lib/run-image-types';
import type { StrategyRunJudgeResultEntry } from '@/lib/strategy-run-judge-results';

export type { InputImage };

export interface StepResult {
  id: string;
  status: string;
  outputUrl: string | null;
  error: string | null;
  executionTime: number | null;
  processedUserPrompt: string | null;
  processedSystemPrompt: string | null;
  inputImages: InputImage[] | null;
  requestConfig: Record<string, unknown> | null;
  step: {
    stepOrder: number;
    name: string | null;
    model: string;
  } | null;
}

export interface RunData {
  id: string;
  status: string;
  createdAt: string;
  source: string | null;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: InputImage[] | null;
  judgeResults: StrategyRunJudgeResultEntry[];
  strategy: {
    id: string;
    name: string;
  };
  stepResults: StepResult[];
}

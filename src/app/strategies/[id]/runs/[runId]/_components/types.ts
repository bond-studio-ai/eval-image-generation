import type { StrategyRunJudgeResultEntry } from '@/lib/strategy-run-judge-results';

export interface StepInfo {
  stepOrder: number;
  name: string | null;
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  dollhouseViewFromStep: number | null;
  realPhotoFromStep: number | null;
  moodBoardFromStep: number | null;
  promptVersion: { id: string; name: string | null } | null;
}

export interface InputImage {
  url: string;
  label: string;
  isComposite?: boolean;
  sourceImages?: { url: string; label: string }[];
}

/**
 * Per-category SAM 3.1 response. The backend stores the raw FAL payload as JSONB
 * and the case-converter middleware passes it through as-is (single-word keys);
 * we treat fields defensively because per-category responses can be sparse.
 */
export interface SegmentationCategoryResponse {
  image?: string | null;
  masks?: string[];
  scores?: number[];
  boxes?: number[][];
  metadata?: Record<string, unknown> | null;
}

export interface Segmentation {
  generationResultId: string;
  createdAt: string;
  // `results` is raw backend JSON; older/partial payloads may omit it entirely
  // or send `null`, so callers must guard before iterating.
  results: Record<string, SegmentationCategoryResponse | null | undefined> | null | undefined;
}

export interface StepResult {
  id: string;
  status: string;
  outputUrl: string | null;
  error: string | null;
  executionTime: number | null;
  generationId: string | null;
  isJudgeSelected: boolean;
  processedUserPrompt: string | null;
  processedSystemPrompt: string | null;
  inputImages: InputImage[] | null;
  requestConfig: Record<string, unknown> | null;
  step: StepInfo | null;
  segmentation: Segmentation | null;
}

export interface StepGroup {
  stepOrder: number;
  name: string;
  model: string;
  step: StepInfo | null;
  results: StepResult[];
}

export interface RunData {
  id: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  source: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: InputImage[] | null;
  judgeTypeUsed: string | null;
  judgeResults: StrategyRunJudgeResultEntry[];
  strategy: {
    id: string;
    name: string;
    model?: string;
    aspectRatio?: string;
    outputResolution?: string;
    temperature?: string | null;
    useGoogleSearch?: boolean;
    tagImages?: boolean;
    hasJudge?: boolean;
  };
  stepResults: StepResult[];
}

export interface SegmentationCategoryRow {
  category: string;
  label: string;
  composite: string | null;
  maskCount: number;
  topScore: number | null;
  raw: SegmentationCategoryResponse;
}

export interface ViewingPromptState {
  id: string | null;
  name: string | null;
  processedSystemPrompt: string | null;
  processedUserPrompt: string | null;
}

export type ViewingPromptAction =
  | {
      type: 'open';
      id: string;
      name: string | null;
      processedSystemPrompt: string | null;
      processedUserPrompt: string | null;
    }
  | { type: 'close' };

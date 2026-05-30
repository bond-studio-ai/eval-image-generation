export interface RunListItem {
  id: string;
  batchRunId: string | null;
  groupId: string | null;
  strategyId: string;
  strategyName: string | null;
  status: string;
  createdAt: string;
  source: string | null;
  inputPresetName: string | null;
  lastOutputUrl: string | null;
  judgeScore: number | null;
}

export type AuditRunGroup = {
  id: string;
  batchRunId: string | null;
  groupId: string | null;
  runs: RunListItem[];
  createdAt: string;
  strategyName: string | null;
  source: string | null;
};

export const SOURCE_LABELS: Record<string, string> = {
  preset: "Preset",
  raw_input: "Real Input",
  batch: "Batch",
  retry: "Preset"
};

export const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All runs" },
  { value: "preset", label: "Preset runs" },
  { value: "raw_input", label: "Real Input runs" }
] as const;

export type SourceFilter = (typeof SOURCE_FILTER_OPTIONS)[number]["value"];

export const THUMB = 48;
export const PAGE_SIZE = 50;

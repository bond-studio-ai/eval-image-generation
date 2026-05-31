export interface SummaryData {
  sceneRatedCount: number;
  sceneGoodPct: number;
  sceneFailedPct: number;
  productRatedCount: number;
  productGoodPct: number;
  productFailedPct: number;
}

export interface IssueItem {
  issue: string;
  count: number;
}

export interface CategoryRate {
  name: string;
  total: number;
  success: number;
  failure: number;
  successPct: number;
  failurePct: number;
  issues: IssueItem[];
}

export interface StepPerformanceRow {
  stepId: string;
  stepOrder: number;
  name: string | null;
  type: string;
  model: string | null;
  sampleCount: number;
  avgExecTimeMs: number | null;
  minExecTimeMs: number | null;
  maxExecTimeMs: number | null;
}

export interface SliceData {
  summary: SummaryData | null;
  sceneIssues: IssueItem[];
  categories: CategoryRate[];
  steps: StepPerformanceRow[];
}

export type SortField = "successPct" | "failurePct";

export interface SortCol {
  sliceKey: string;
  field: SortField;
  dir: "asc" | "desc";
}

export type CategoryRow = { type: "category"; categoryName: string } | { type: "issue"; categoryName: string; issueName: string };

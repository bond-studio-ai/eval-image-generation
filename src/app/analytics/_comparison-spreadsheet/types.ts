export type SummaryData = {
  sceneRatedCount: number;
  sceneGoodPct: number;
  sceneFailedPct: number;
  productRatedCount: number;
  productGoodPct: number;
  productFailedPct: number;
};

export type IssueItem = { issue: string; count: number };

export type CategoryRate = {
  name: string;
  total: number;
  success: number;
  failure: number;
  successPct: number;
  failurePct: number;
  issues: IssueItem[];
};

export type StepPerformanceRow = {
  stepId: string;
  stepOrder: number;
  name: string | null;
  type: string;
  model: string | null;
  sampleCount: number;
  avgExecTimeMs: number | null;
  minExecTimeMs: number | null;
  maxExecTimeMs: number | null;
};

export type SliceData = {
  summary: SummaryData | null;
  sceneIssues: IssueItem[];
  categories: CategoryRate[];
  steps: StepPerformanceRow[];
};

export type SortField = 'successPct' | 'failurePct';

export type SortCol = { sliceKey: string; field: SortField; dir: 'asc' | 'desc' };

export type CategoryRow =
  | { type: 'category'; categoryName: string }
  | { type: 'issue'; categoryName: string; issueName: string };

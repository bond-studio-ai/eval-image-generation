export type StrategyRow = {
  id: string;
  name: string;
  model: string;
  generationCount: number;
  sceneRatedCount: number;
  sceneGoodPct: number;
  sceneFailedPct: number;
  productRatedCount: number;
  productGoodPct: number;
  productFailedPct: number;
  notRatedCount: number;
  notRatedPct: number;
  avgExecTimeMs: number | null;
};

export type IssueItem = { issue: string; count: number };
export type ErrorItem = { reason: string; count: number };

export type BreakdownData = {
  execution_errors: ErrorItem[];
  scene_issues: IssueItem[];
  product_issues: IssueItem[];
  rating_summary: {
    total: number;
    scene_good: number;
    scene_failed: number;
    scene_unset: number;
    product_good: number;
    product_failed: number;
    product_unset: number;
  } | null;
};

export type SortKey = "name" | "generationCount" | "sceneGoodPct" | "sceneFailedPct" | "productGoodPct" | "productFailedPct" | "notRatedCount" | "avgExecTimeMs";
export type SortDir = "asc" | "desc";

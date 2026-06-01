// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnalyticsComparisonSlice } from "@/app/analytics/comparison-utils";
import { SceneIssuesTable } from "@/app/analytics/_comparison-spreadsheet/scene-issues-table";
import type { SliceData } from "@/app/analytics/_comparison-spreadsheet/types";

const slice: AnalyticsComparisonSlice = {
  key: "slice-1",
  range: { from: "2026-01-01", to: "2026-01-31" },
  strategyId: "s1",
  strategyName: "Strategy One",
  source: "preset",
  label: "Preset | Jan 1 - Jan 31"
};

const data: Record<string, SliceData> = {
  "slice-1": {
    summary: { sceneRatedCount: 10, sceneGoodPct: 70, sceneFailedPct: 30, productRatedCount: 0, productGoodPct: 0, productFailedPct: 0 },
    sceneIssues: [{ issue: "blurry", count: 2 }],
    categories: [],
    steps: []
  }
};

describe("SceneIssuesTable", () => {
  it("renders the strategy header and overall summary", () => {
    render(<SceneIssuesTable slices={[slice]} dataBySlice={data} loading={false} sceneIssueRows={["blurry"]} />);
    expect(screen.getByText("Scene Accuracy Issues")).toBeInTheDocument();
    expect(screen.getByText("Strategy One")).toBeInTheDocument();
    expect(screen.getByText("10 rated")).toBeInTheDocument();
  });

  it("shows a loading row while loading", () => {
    render(<SceneIssuesTable slices={[slice]} dataBySlice={{}} loading sceneIssueRows={[]} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an empty message when there are no issue rows", () => {
    render(<SceneIssuesTable slices={[slice]} dataBySlice={data} loading={false} sceneIssueRows={[]} />);
    expect(screen.getByText("No scene accuracy issues found.")).toBeInTheDocument();
  });

  it("renders an issue row with its count and percentage of failures", () => {
    render(<SceneIssuesTable slices={[slice]} dataBySlice={data} loading={false} sceneIssueRows={["blurry"]} />);
    // 10 rated * 30% failed = 3 failed; 2/3 ≈ 67%
    expect(screen.getByText("2 (67%)")).toBeInTheDocument();
  });
});

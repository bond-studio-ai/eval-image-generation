import { describe, expect, it } from "vitest";
import { deriveBatchStatus, groupStrategyRuns, isAwaitingJudge } from "./strategy-runs-view";

describe("strategy run view helpers", () => {
  it("detects batches waiting for judge selection", () => {
    expect(
      isAwaitingJudge(
        [
          { id: "a", status: "completed", createdAt: "2026-01-01", lastOutputUrl: "a.png" },
          { id: "b", status: "failed", createdAt: "2026-01-01", lastOutputUrl: "b.png" }
        ],
        true
      )
    ).toBe(true);
  });

  it("does not mark incomplete or already-judged batches as awaiting judge", () => {
    expect(
      isAwaitingJudge(
        [
          { id: "a", status: "running", createdAt: "2026-01-01", lastOutputUrl: "a.png" },
          { id: "b", status: "completed", createdAt: "2026-01-01", lastOutputUrl: "b.png" }
        ],
        true
      )
    ).toBe(false);
    expect(
      isAwaitingJudge(
        [
          {
            id: "a",
            status: "completed",
            createdAt: "2026-01-01",
            lastOutputUrl: "a.png",
            judgeScore: 90
          },
          { id: "b", status: "completed", createdAt: "2026-01-01", lastOutputUrl: "b.png" }
        ],
        true
      )
    ).toBe(false);
  });

  it("derives the aggregate batch status by priority", () => {
    expect(deriveBatchStatus([{ id: "a", status: "completed", createdAt: "2026-01-01" }])).toBe("completed");
    expect(
      deriveBatchStatus([
        { id: "a", status: "completed", createdAt: "2026-01-01" },
        { id: "b", status: "running", createdAt: "2026-01-01" }
      ])
    ).toBe("running");
    expect(deriveBatchStatus([{ id: "a", status: "failed", createdAt: "2026-01-01" }])).toBe("failed");
  });

  it("groups standalone and batch runs and orders newest groups first", () => {
    expect(
      groupStrategyRuns(
        [
          { id: "old-b", groupId: "batch-old", status: "completed", createdAt: "2026-01-01" },
          { id: "new-a", groupId: "batch-new", status: "completed", createdAt: "2026-01-03" },
          { id: "new-b", groupId: "batch-new", status: "completed", createdAt: "2026-01-04" },
          { id: "solo", status: "completed", createdAt: "2026-01-02" }
        ],
        false
      ).map((group) => ({
        id: group.id,
        runIds: group.runs.map((run) => run.id),
        isStandalone: group.isStandalone
      }))
    ).toEqual([
      { id: "batch-new", runIds: ["new-a", "new-b"], isStandalone: false },
      { id: "solo", runIds: ["solo"], isStandalone: true },
      { id: "batch-old", runIds: ["old-b"], isStandalone: false }
    ]);
  });
});

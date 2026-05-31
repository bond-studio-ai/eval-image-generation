"use client";

import { useQuery } from "@tanstack/react-query";
import ms from "ms";
import { useCallback, useReducer, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { serviceUrl } from "@/lib/api-base";
import { assertNever } from "@/lib/assert-never";
import { parseStrategyRunJudgeResults } from "@/lib/strategy-run-judge-results";
import { ExecutionFlowSection } from "./_components/execution-flow-section";
import { JudgeEvaluationSection } from "./_components/judge-evaluation-section";
import { RunDetailModals } from "./_components/run-detail-modals";
import { RunFailureReasons } from "./_components/run-failure-reasons";
import { RunSummaryCard } from "./_components/run-summary-card";
import { StepResultsSection } from "./_components/step-results-section";
import { groupStepResults } from "./_components/types";
import type { RunData, ViewingPromptAction, ViewingPromptState } from "./_components/types";

const POLL_INTERVAL = ms("3s");

/* ---------- Prompt-viewer modal state ---------- */

const INITIAL_VIEWING_PROMPT: ViewingPromptState = {
  id: null,
  name: null,
  processedSystemPrompt: null,
  processedUserPrompt: null
};

function viewingPromptReducer(_state: ViewingPromptState, action: ViewingPromptAction): ViewingPromptState {
  switch (action.type) {
    case "close": {
      return INITIAL_VIEWING_PROMPT;
    }
    case "open": {
      return {
        id: action.id,
        name: action.name,
        processedSystemPrompt: action.processedSystemPrompt,
        processedUserPrompt: action.processedUserPrompt
      };
    }
    default: {
      return assertNever(action);
    }
  }
}

/* ---------- Main component ---------- */

export function RunDetail({ strategyId, runId, initialData }: { strategyId: string; runId: string; initialData: RunData }) {
  // Poll only while the run is still working; the interval function returns
  // false once it settles. On fetch error React Query keeps the last good data.
  const { data, refetch } = useQuery({
    queryKey: ["strategy-run", runId],
    queryFn: async () => {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}`), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data?: unknown };
      if (!json.data) throw new Error("Missing run data");
      const raw = json.data as { judgeResults?: unknown };
      return {
        ...(json.data as RunData),
        judgeResults: parseStrategyRunJudgeResults(raw.judgeResults)
      };
    },
    initialData,
    refetchOnMount: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? POLL_INTERVAL : false;
    }
  });

  const [retrying, setRetrying] = useState(false);
  const [markingStatus, setMarkingStatus] = useState<"idle" | "failed" | "completed">("idle");
  const [viewingPrompt, dispatchViewingPrompt] = useReducer(viewingPromptReducer, INITIAL_VIEWING_PROMPT);
  const [showJudgeModal, setShowJudgeModal] = useState(false);

  const [showExecFlow, setShowExecFlow] = useState(false);
  const [showJudge, setShowJudge] = useState(true);
  const [showSteps, setShowSteps] = useState(true);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}/retry`), { method: "POST" });
      if (!res.ok) return;
      await refetch();
    } catch {
      /* ignore */
    } finally {
      setRetrying(false);
    }
  }, [runId, refetch]);

  const handleMarkStatus = useCallback(
    async (status: "failed" | "completed") => {
      setMarkingStatus(status);
      try {
        const res = await fetch(serviceUrl(`strategy-runs/${runId}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (!res.ok) return;
        await refetch();
      } catch {
        /* ignore */
      } finally {
        setMarkingStatus("idle");
      }
    },
    [runId, refetch]
  );

  const handleViewPrompt = useCallback((id: string, name: string | null, processedSystemPrompt: string | null, processedUserPrompt: string | null) => {
    dispatchViewingPrompt({
      type: "open",
      id,
      name,
      processedSystemPrompt,
      processedUserPrompt
    });
  }, []);

  const sorted = data.stepResults.toSorted((a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0));

  const stepGroups = groupStepResults(sorted);

  const elapsedStart = data.startedAt ?? data.createdAt;
  const duration = data.completedAt ? Math.round((new Date(data.completedAt).getTime() - new Date(elapsedStart).getTime()) / 1000) : null;

  const hasConfig = data.strategy.model != null || data.strategy.aspectRatio != null;

  return (
    <div>
      <PageHeader backHref={`/strategies/${strategyId}`} backLabel={`Back to ${data.strategy.name}`} title="Strategy Run" subtitle={`${data.strategy.name} · ${new Date(data.createdAt).toLocaleString()}`} />

      <RunSummaryCard
        data={data}
        duration={duration}
        stepCount={stepGroups.length}
        generationCount={sorted.length}
        hasOutput={sorted.some((sr) => sr.outputUrl)}
        hasConfig={hasConfig}
        markingStatus={markingStatus}
        retrying={retrying}
        onMarkStatus={handleMarkStatus}
        onRetry={handleRetry}
        onShowJudgeModal={() => {
          setShowJudgeModal(true);
        }}
      />

      <RunFailureReasons status={data.status} sorted={sorted} />

      {/* ──── Collapsible sections ──── */}
      <div className="mt-6 space-y-4">
        <ExecutionFlowSection
          stepGroups={stepGroups}
          judgeResults={data.judgeResults}
          open={showExecFlow}
          onToggle={() => {
            setShowExecFlow(!showExecFlow);
          }}
        />

        <JudgeEvaluationSection
          data={data}
          open={showJudge}
          onToggle={() => {
            setShowJudge(!showJudge);
          }}
        />

        <StepResultsSection
          stepGroups={stepGroups}
          open={showSteps}
          onToggle={() => {
            setShowSteps(!showSteps);
          }}
          onViewPrompt={handleViewPrompt}
        />
      </div>

      <RunDetailModals
        data={data}
        showJudgeModal={showJudgeModal}
        onCloseJudgeModal={() => {
          setShowJudgeModal(false);
        }}
        viewingPrompt={viewingPrompt}
        onCloseViewingPrompt={() => {
          dispatchViewingPrompt({ type: "close" });
        }}
      />
    </div>
  );
}

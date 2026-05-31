"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { buildPanels, type DetailPanel } from "@/components/judge-score-badge-utils";
import { AlertTriangleIcon, InfoIcon, StarIcon, XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { serviceUrl } from "@/lib/api-base";
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

interface JudgeScoreBadgeProps {
  runId?: string | null;
  judgeScore: number | null | undefined;
  isJudgeSelected?: boolean;
  judgeReasoning?: string | null;
  judgeOutput?: string | null;
  judgeSystemPrompt?: string | null;
  judgeUserPrompt?: string | null;
  judgeTypeUsed?: string | null;
  /** Per-judge rows from API; when multiple, modal shows a judge selector. */
  judgeResults?: StrategyRunJudgeResultEntry[] | null;
  awaitingJudge?: boolean;
}

type ModalTabId = "reasoning" | "output" | "system" | "user";

interface RawJudgeDetail {
  judgeResults?: unknown;
  stepResults?: unknown;
  judgeScore?: unknown;
  isJudgeSelected?: unknown;
  judgeReasoning?: unknown;
  judgeOutput?: unknown;
  judgeSystemPrompt?: unknown;
  judgeUserPrompt?: unknown;
  judgeTypeUsed?: unknown;
}

interface RawStepResult {
  isJudgeSelected?: unknown;
  candidateIndex?: unknown;
}

function panelHasContent(panel: DetailPanel): boolean {
  return Boolean(panel.reasoning?.trim() || panel.output?.trim() || panel.systemPrompt?.trim() || panel.userPrompt?.trim());
}

function getAvailableTabs(panel: DetailPanel): ModalTabId[] {
  return ["reasoning", ...(panel.output?.trim() ? ["output" as const] : []), ...(panel.systemPrompt?.trim() ? ["system" as const] : []), ...(panel.userPrompt?.trim() ? ["user" as const] : [])];
}

export function ReasoningModal({ aggregateScore, panels, isSelected, isFailed, onClose }: { aggregateScore: number; panels: DetailPanel[]; isSelected?: boolean | undefined; isFailed: boolean; onClose: () => void }) {
  const [judgeIdx, setJudgeIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<ModalTabId>("reasoning");

  const panel = panels[judgeIdx] ?? panels[0];
  const multiJudge = panels.length > 1;

  if (!panel) return null;

  const reasoning = panel.reasoning?.trim() || "No reasoning provided";
  const output = panel.output?.trim() || null;
  const systemPrompt = panel.systemPrompt?.trim() || null;
  const userPrompt = panel.userPrompt?.trim() || null;

  const hasExtra = Boolean(output) || Boolean(systemPrompt) || Boolean(userPrompt);

  const tabs = [
    { id: "reasoning" as const, label: "Reasoning" },
    ...(output ? [{ id: "output" as const, label: "Output" }] : []),
    ...(systemPrompt ? [{ id: "system" as const, label: "System Prompt" }] : []),
    ...(userPrompt ? [{ id: "user" as const, label: "User Prompt" }] : [])
  ];

  return (
    <Modal onClose={onClose} labelledById="judge-details-title" backdropClassName="bg-overlay/40 backdrop-blur-sm" className="bg-surface flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-xl shadow-2xl">
      <div className="border-border relative border-b px-6 pt-5 pb-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {isFailed ? (
              <span className="bg-danger-100 inline-flex size-8 shrink-0 items-center justify-center rounded-full">
                <AlertTriangleIcon className="text-danger-600 size-4" />
              </span>
            ) : (
              <span className={`text-body inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${isSelected ? "bg-warning-100 text-warning-800" : "bg-surface-sunken text-text-secondary"}`}>{aggregateScore}</span>
            )}
            <h3 id="judge-details-title" className="text-text-primary text-body-lg font-semibold">
              {isFailed ? "Judge Error" : "Judge Details"}
            </h3>
            {!isFailed && isSelected && (
              <span className="bg-warning-100 text-warning-800 text-caption inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium">
                <StarIcon className="size-3" fill="currentColor" />
                Selected
              </span>
            )}
          </div>
          {multiJudge && !isFailed && <p className="text-text-muted text-[11px]">Average score shown; per-judge raw scores below.</p>}
        </div>
        <button type="button" aria-label="Close judge details" onClick={onClose} className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary absolute top-4 right-4 rounded-lg p-1.5 transition-colors">
          <XIcon className="size-5" />
        </button>
      </div>

      {multiJudge && (
        <div className="border-border bg-surface-muted/80 border-b px-4 py-3">
          <p className="text-text-muted mb-2 text-[11px] font-medium tracking-wider uppercase">Judges</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {panels.map((panelOption, i) => (
              <button
                key={panelOption.key}
                type="button"
                onClick={() => {
                  const nextPanel = panels[i] ?? panels[0];
                  setJudgeIdx(i);
                  if (nextPanel) setActiveTab((currentTab) => (getAvailableTabs(nextPanel).includes(currentTab) ? currentTab : "reasoning"));
                }}
                className={`rounded-xl border px-3 py-2 text-left transition-all ${
                  judgeIdx === i ? "border-primary-200 text-primary-700 ring-primary-100 bg-surface shadow-sm ring-1" : "bg-surface/70 text-text-secondary hover:border-border hover:bg-surface border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-caption truncate font-semibold ${judgeIdx === i ? "text-primary-700" : "text-text-secondary"}`}>{panelOption.shortLabel}</p>
                    <p className="text-text-muted truncate font-mono text-[10px]">{panelOption.judgeModel}</p>
                  </div>
                  {panelOption.rawScore != null && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${judgeIdx === i ? "bg-primary-50 text-primary-700" : "bg-primary-50 text-primary-600"}`}>{panelOption.rawScore}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!multiJudge && (panel.judgeModel || panel.judgeTypeUsed || panel.judgePromptVersionId) && (
        <div className="border-border-subtle border-b px-6 py-2">
          {panel.judgeModel && (
            <p className="text-text-secondary text-caption">
              <span className="font-medium">{panel.judgeModel}</span>
              {panel.rawScore != null && <span className="text-primary-600 ml-2">Score: {panel.rawScore}</span>}
            </p>
          )}
          {panel.judgeTypeUsed && (
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${panel.judgeTypeUsed === "batch" ? "bg-primary-100 text-primary-700" : "bg-surface-sunken text-text-secondary"}`}>{panel.judgeTypeUsed}</span>
          )}
          {panel.judgePromptVersionId && (
            <Link href={`/prompt-versions/${panel.judgePromptVersionId}`} className="text-primary-600 hover:text-primary-500 mt-1 block text-[11px]">
              {panel.judgePromptVersionName || "View prompt version"}
            </Link>
          )}
        </div>
      )}

      {multiJudge && (
        <div className="border-border-subtle flex flex-wrap items-center gap-2 border-b px-6 py-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${panel.judgeType === "batch" ? "bg-primary-100 text-primary-700" : "bg-surface-sunken text-text-secondary"}`}>Config: {panel.judgeType}</span>
          {panel.judgeTypeUsed && (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${panel.judgeTypeUsed === "batch" ? "bg-primary-50 text-primary-600" : "bg-surface-muted text-text-muted"}`}>Used: {panel.judgeTypeUsed}</span>
          )}
          {panel.judgePromptVersionId && (
            <Link href={`/prompt-versions/${panel.judgePromptVersionId}`} className="text-primary-600 hover:text-primary-500 text-[11px]">
              {panel.judgePromptVersionName || "Prompt version"}
            </Link>
          )}
        </div>
      )}

      {hasExtra && (
        <div className="border-border flex gap-1 border-b px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`text-caption -mb-px border-b-2 px-3 py-2.5 font-medium transition-colors ${activeTab === tab.id ? "border-primary-500 text-primary-600" : "text-text-muted hover:border-border-strong hover:text-text-secondary border-transparent"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {activeTab === "reasoning" && <p className={`text-body leading-relaxed ${isFailed ? "text-danger-700" : "text-text-secondary"}`}>{reasoning}</p>}
        {activeTab === "output" && output && <pre className="text-text-secondary text-caption leading-relaxed whitespace-pre-wrap">{output}</pre>}
        {activeTab === "system" && systemPrompt && <pre className="text-text-secondary text-caption leading-relaxed whitespace-pre-wrap">{systemPrompt}</pre>}
        {activeTab === "user" && userPrompt && <pre className="text-text-secondary text-caption leading-relaxed whitespace-pre-wrap">{userPrompt}</pre>}
      </div>
    </Modal>
  );
}

export function JudgeScoreBadge({ runId, judgeScore, isJudgeSelected, judgeReasoning, judgeOutput, judgeSystemPrompt, judgeUserPrompt, judgeTypeUsed, judgeResults, awaitingJudge }: JudgeScoreBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const [fetchedDetail, setFetchedDetail] = useState<{
    judgeScore: number | null;
    isJudgeSelected?: boolean;
    judgeReasoning?: string | null;
    judgeOutput?: string | null;
    judgeSystemPrompt?: string | null;
    judgeUserPrompt?: string | null;
    judgeTypeUsed?: string | null;
    judgeResults: StrategyRunJudgeResultEntry[];
  } | null>(null);
  const isLoadingDetail = useRef(false);

  const panels = useMemo(
    () =>
      buildPanels(fetchedDetail?.judgeResults ?? judgeResults ?? null, {
        judgeReasoning: fetchedDetail?.judgeReasoning ?? judgeReasoning ?? null,
        judgeOutput: fetchedDetail?.judgeOutput ?? judgeOutput ?? null,
        judgeSystemPrompt: fetchedDetail?.judgeSystemPrompt ?? judgeSystemPrompt ?? null,
        judgeUserPrompt: fetchedDetail?.judgeUserPrompt ?? judgeUserPrompt ?? null,
        judgeTypeUsed: fetchedDetail?.judgeTypeUsed ?? judgeTypeUsed ?? null,
        judgeScore: fetchedDetail?.judgeScore ?? judgeScore ?? null
      }),
    [fetchedDetail, judgeResults, judgeReasoning, judgeOutput, judgeSystemPrompt, judgeUserPrompt, judgeTypeUsed, judgeScore]
  );

  const hasDetail = panels.some(panelHasContent);

  const openDetailModal = async (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!hasDetail) return;
    e.stopPropagation();
    e.preventDefault();
    setShowModal(true);
    if (!runId) return;
    if (isLoadingDetail.current) return;
    if ((judgeResults?.length ?? 0) > 1 && fetchedDetail) return;
    try {
      isLoadingDetail.current = true;
      const res = await fetch(serviceUrl(`strategy-runs/${runId}`), { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: unknown };
      const raw = (json.data ?? {}) as RawJudgeDetail;
      const allJudgeResults = parseStrategyRunJudgeResults(raw.judgeResults);

      let winnerCandidateIndex: number | null = null;
      const stepResults = Array.isArray(raw.stepResults) ? raw.stepResults : [];
      for (const sr of stepResults) {
        if (sr && typeof sr === "object") {
          const stepResult = sr as RawStepResult;
          if (stepResult.isJudgeSelected && stepResult.candidateIndex != null) {
            winnerCandidateIndex = Number(stepResult.candidateIndex);
            break;
          }
        }
      }

      const hasTaggedResults = allJudgeResults.some((j) => j.candidateIndex != null);
      const filteredResults = winnerCandidateIndex != null && hasTaggedResults ? allJudgeResults.filter((j) => j.candidateIndex === winnerCandidateIndex) : allJudgeResults;

      setFetchedDetail({
        judgeScore: raw.judgeScore == null ? null : Number(raw.judgeScore),
        isJudgeSelected: Boolean(raw.isJudgeSelected),
        judgeReasoning: raw.judgeReasoning == null ? null : String(raw.judgeReasoning),
        judgeOutput: raw.judgeOutput == null ? null : String(raw.judgeOutput),
        judgeSystemPrompt: raw.judgeSystemPrompt == null ? null : String(raw.judgeSystemPrompt),
        judgeUserPrompt: raw.judgeUserPrompt == null ? null : String(raw.judgeUserPrompt),
        judgeTypeUsed: raw.judgeTypeUsed == null ? null : String(raw.judgeTypeUsed),
        judgeResults: filteredResults
      });
    } catch {
      // Keep the fallback data already shown in the modal.
    } finally {
      isLoadingDetail.current = false;
    }
  };

  if (judgeScore != null && judgeScore > 0) {
    return (
      <>
        <span
          role="button"
          tabIndex={0}
          className={`absolute top-1 left-1 z-10 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${hasDetail ? "cursor-help" : ""} ${isJudgeSelected ? "bg-warning-400 text-warning-900" : "text-text-inverse bg-text-secondary/70"}`}
          onClick={openDetailModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") void openDetailModal(e);
          }}
        >
          {judgeScore}
        </span>
        {showModal && hasDetail && (
          <ReasoningModal
            aggregateScore={fetchedDetail?.judgeScore ?? judgeScore}
            panels={panels}
            isSelected={fetchedDetail?.isJudgeSelected ?? isJudgeSelected}
            isFailed={false}
            onClose={() => {
              setShowModal(false);
            }}
          />
        )}
      </>
    );
  }

  if (judgeScore === 0) {
    return (
      <>
        <span
          role="button"
          tabIndex={0}
          className={`bg-danger-500/90 text-text-inverse absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${hasDetail ? "cursor-help" : ""}`}
          onClick={openDetailModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") void openDetailModal(e);
          }}
        >
          <InfoIcon className="size-2.5" />
          Judge failed
        </span>
        {showModal && (
          <ReasoningModal
            aggregateScore={0}
            panels={panels}
            isFailed
            onClose={() => {
              setShowModal(false);
            }}
          />
        )}
      </>
    );
  }

  if (awaitingJudge) {
    return (
      <span className="bg-warning-500/90 text-text-inverse absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm">
        <Spinner className="size-2.5" />
        Judging
      </span>
    );
  }

  return null;
}

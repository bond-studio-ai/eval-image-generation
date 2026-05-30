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

function panelHasContent(p: DetailPanel): boolean {
  return !!(p.reasoning?.trim() || p.output?.trim() || p.systemPrompt?.trim() || p.userPrompt?.trim());
}

function getAvailableTabs(panel: DetailPanel): ModalTabId[] {
  return ["reasoning", ...(panel.output?.trim() ? ["output" as const] : []), ...(panel.systemPrompt?.trim() ? ["system" as const] : []), ...(panel.userPrompt?.trim() ? ["user" as const] : [])];
}

export function ReasoningModal({ aggregateScore, panels, isSelected, isFailed, onClose }: { aggregateScore: number; panels: DetailPanel[]; isSelected?: boolean; isFailed: boolean; onClose: () => void }) {
  const [judgeIdx, setJudgeIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<ModalTabId>("reasoning");

  const panel = panels[judgeIdx] ?? panels[0];
  const multiJudge = panels.length > 1;

  const reasoning = panel.reasoning?.trim() || "No reasoning provided";
  const output = panel.output?.trim() || null;
  const systemPrompt = panel.systemPrompt?.trim() || null;
  const userPrompt = panel.userPrompt?.trim() || null;

  const hasExtra = !!output || !!systemPrompt || !!userPrompt;

  const tabs = [
    { id: "reasoning" as const, label: "Reasoning" },
    ...(output ? [{ id: "output" as const, label: "Output" }] : []),
    ...(systemPrompt ? [{ id: "system" as const, label: "System Prompt" }] : []),
    ...(userPrompt ? [{ id: "user" as const, label: "User Prompt" }] : [])
  ];

  return (
    <Modal onClose={onClose} labelledById="judge-details-title" backdropClassName="bg-black/40 backdrop-blur-sm" className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
      <div className="relative border-b border-gray-200 px-6 pt-5 pb-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {isFailed ? (
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangleIcon className="size-4 text-red-600" />
              </span>
            ) : (
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isSelected ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}>{aggregateScore}</span>
            )}
            <h3 id="judge-details-title" className="text-base font-semibold text-gray-900">
              {isFailed ? "Judge Error" : "Judge Details"}
            </h3>
            {!isFailed && isSelected && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <StarIcon className="size-3" fill="currentColor" />
                Selected
              </span>
            )}
          </div>
          {multiJudge && !isFailed && <p className="text-[11px] text-gray-500">Average score shown; per-judge raw scores below.</p>}
        </div>
        <button type="button" aria-label="Close judge details" onClick={onClose} className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
          <XIcon className="size-5" />
        </button>
      </div>

      {multiJudge && (
        <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3">
          <p className="mb-2 text-[11px] font-medium tracking-wider text-gray-500 uppercase">Judges</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {panels.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  const nextPanel = panels[i] ?? panels[0];
                  setJudgeIdx(i);
                  setActiveTab((currentTab) => (getAvailableTabs(nextPanel).includes(currentTab) ? currentTab : "reasoning"));
                }}
                className={`rounded-xl border px-3 py-2 text-left transition-all ${
                  judgeIdx === i ? "border-primary-200 text-primary-700 ring-primary-100 bg-white shadow-sm ring-1" : "border-transparent bg-white/70 text-gray-700 hover:border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-semibold ${judgeIdx === i ? "text-primary-700" : "text-gray-800"}`}>{p.shortLabel}</p>
                    <p className="truncate font-mono text-[10px] text-gray-500">{p.judgeModel}</p>
                  </div>
                  {p.rawScore != null && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${judgeIdx === i ? "bg-primary-50 text-primary-700" : "bg-indigo-50 text-indigo-600"}`}>{p.rawScore}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!multiJudge && (panel.judgeModel || panel.judgeTypeUsed || panel.judgePromptVersionId) && (
        <div className="border-b border-gray-100 px-6 py-2">
          {panel.judgeModel && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">{panel.judgeModel}</span>
              {panel.rawScore != null && <span className="ml-2 text-indigo-600">Score: {panel.rawScore}</span>}
            </p>
          )}
          {panel.judgeTypeUsed && (
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${panel.judgeTypeUsed === "batch" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>{panel.judgeTypeUsed}</span>
          )}
          {panel.judgePromptVersionId && (
            <Link href={`/prompt-versions/${panel.judgePromptVersionId}`} className="text-primary-600 hover:text-primary-500 mt-1 block text-[11px]">
              {panel.judgePromptVersionName || "View prompt version"}
            </Link>
          )}
        </div>
      )}

      {multiJudge && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${panel.judgeType === "batch" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>Config: {panel.judgeType}</span>
          {panel.judgeTypeUsed && (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${panel.judgeTypeUsed === "batch" ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-500"}`}>Used: {panel.judgeTypeUsed}</span>
          )}
          {panel.judgePromptVersionId && (
            <Link href={`/prompt-versions/${panel.judgePromptVersionId}`} className="text-primary-600 hover:text-primary-500 text-[11px]">
              {panel.judgePromptVersionName || "Prompt version"}
            </Link>
          )}
        </div>
      )}

      {hasExtra && (
        <div className="flex gap-1 border-b border-gray-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.id ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {activeTab === "reasoning" && <p className={`text-sm leading-relaxed ${isFailed ? "text-red-700" : "text-gray-700"}`}>{reasoning}</p>}
        {activeTab === "output" && output && <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700">{output}</pre>}
        {activeTab === "system" && systemPrompt && <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700">{systemPrompt}</pre>}
        {activeTab === "user" && userPrompt && <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700">{userPrompt}</pre>}
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
        judgeReasoning: fetchedDetail?.judgeReasoning ?? judgeReasoning,
        judgeOutput: fetchedDetail?.judgeOutput ?? judgeOutput,
        judgeSystemPrompt: fetchedDetail?.judgeSystemPrompt ?? judgeSystemPrompt,
        judgeUserPrompt: fetchedDetail?.judgeUserPrompt ?? judgeUserPrompt,
        judgeTypeUsed: fetchedDetail?.judgeTypeUsed ?? judgeTypeUsed,
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
      const json = await res.json();
      const raw = (json.data ?? {}) as Record<string, unknown>;
      const allJudgeResults = parseStrategyRunJudgeResults(raw.judgeResults);

      let winnerCandidateIndex: number | null = null;
      const stepResults = Array.isArray(raw.stepResults) ? raw.stepResults : [];
      for (const sr of stepResults) {
        if (sr && typeof sr === "object") {
          const s = sr as Record<string, unknown>;
          if (s.isJudgeSelected && s.candidateIndex != null) {
            winnerCandidateIndex = Number(s.candidateIndex);
            break;
          }
        }
      }

      const hasTaggedResults = allJudgeResults.some((j) => j.candidateIndex != null);
      const filteredResults = winnerCandidateIndex != null && hasTaggedResults ? allJudgeResults.filter((j) => j.candidateIndex === winnerCandidateIndex) : allJudgeResults;

      setFetchedDetail({
        judgeScore: raw.judgeScore != null ? Number(raw.judgeScore) : null,
        isJudgeSelected: Boolean(raw.isJudgeSelected),
        judgeReasoning: raw.judgeReasoning != null ? String(raw.judgeReasoning) : null,
        judgeOutput: raw.judgeOutput != null ? String(raw.judgeOutput) : null,
        judgeSystemPrompt: raw.judgeSystemPrompt != null ? String(raw.judgeSystemPrompt) : null,
        judgeUserPrompt: raw.judgeUserPrompt != null ? String(raw.judgeUserPrompt) : null,
        judgeTypeUsed: raw.judgeTypeUsed != null ? String(raw.judgeTypeUsed) : null,
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
          className={`absolute top-1 left-1 z-10 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${hasDetail ? "cursor-help" : ""} ${isJudgeSelected ? "bg-amber-400 text-amber-900" : "bg-gray-700/70 text-white"}`}
          onClick={openDetailModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openDetailModal(e);
          }}
        >
          {judgeScore}
        </span>
        {showModal && hasDetail && (
          <ReasoningModal aggregateScore={fetchedDetail?.judgeScore ?? judgeScore} panels={panels} isSelected={fetchedDetail?.isJudgeSelected ?? isJudgeSelected} isFailed={false} onClose={() => setShowModal(false)} />
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
          className={`absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ${hasDetail ? "cursor-help" : ""}`}
          onClick={openDetailModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openDetailModal(e);
          }}
        >
          <InfoIcon className="size-2.5" />
          Judge failed
        </span>
        {showModal && <ReasoningModal aggregateScore={0} panels={panels} isFailed onClose={() => setShowModal(false)} />}
      </>
    );
  }

  if (awaitingJudge) {
    return (
      <span className="absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
        <Spinner className="size-2.5" />
        Judging
      </span>
    );
  }

  return null;
}

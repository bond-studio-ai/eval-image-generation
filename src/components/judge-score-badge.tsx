'use client';

import { serviceUrl } from '@/lib/api-base';
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from '@/lib/service-client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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

export type DetailPanel = {
  key: string;
  shortLabel: string;
  judgeName: string | null;
  judgeModel: string;
  judgePromptVersionId: string;
  judgePromptVersionName: string | null;
  judgeType: 'batch' | 'individual';
  judgeTypeUsed: string | null;
  rawScore: number | null;
  reasoning: string | null;
  output: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;
};

type ModalTabId = 'reasoning' | 'output' | 'system' | 'user';

export function buildPanels(
  judgeResults: StrategyRunJudgeResultEntry[] | null | undefined,
  agg: {
    judgeReasoning?: string | null;
    judgeOutput?: string | null;
    judgeSystemPrompt?: string | null;
    judgeUserPrompt?: string | null;
    judgeTypeUsed?: string | null;
    judgeScore?: number | null;
  },
): DetailPanel[] {
  if (judgeResults && judgeResults.length > 0) {
    return judgeResults.map((j, i) => ({
      key: j.id,
      shortLabel: j.judgeName || `#${i + 1}`,
      judgeName: j.judgeName ?? null,
      judgeModel: j.judgeModel,
      judgePromptVersionId: j.judgePromptVersionId,
      judgePromptVersionName: j.judgePromptVersionName,
      judgeType: j.judgeType,
      judgeTypeUsed: j.judgeTypeUsed,
      rawScore: j.judgeScore,
      reasoning: j.judgeReasoning,
      output: j.judgeOutput,
      systemPrompt: j.judgeSystemPrompt,
      userPrompt: j.judgeUserPrompt,
    }));
  }
  return [
    {
      key: 'aggregate',
      shortLabel: 'Judge',
      judgeName: null,
      judgeModel: '',
      judgePromptVersionId: '',
      judgePromptVersionName: null,
      judgeType: 'batch',
      judgeTypeUsed: agg.judgeTypeUsed ?? null,
      rawScore: agg.judgeScore ?? null,
      reasoning: agg.judgeReasoning ?? null,
      output: agg.judgeOutput ?? null,
      systemPrompt: agg.judgeSystemPrompt ?? null,
      userPrompt: agg.judgeUserPrompt ?? null,
    },
  ];
}

function panelHasContent(p: DetailPanel): boolean {
  return !!(
    p.reasoning?.trim() ||
    p.output?.trim() ||
    p.systemPrompt?.trim() ||
    p.userPrompt?.trim()
  );
}

function getAvailableTabs(panel: DetailPanel): ModalTabId[] {
  return [
    'reasoning',
    ...(panel.output?.trim() ? ['output' as const] : []),
    ...(panel.systemPrompt?.trim() ? ['system' as const] : []),
    ...(panel.userPrompt?.trim() ? ['user' as const] : []),
  ];
}

export function ReasoningModal({
  aggregateScore,
  panels,
  isSelected,
  isFailed,
  onClose,
}: {
  aggregateScore: number;
  panels: DetailPanel[];
  isSelected?: boolean;
  isFailed: boolean;
  onClose: () => void;
}) {
  const [judgeIdx, setJudgeIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<ModalTabId>('reasoning');

  const panel = panels[judgeIdx] ?? panels[0];
  const multiJudge = panels.length > 1;

  const reasoning = panel.reasoning?.trim() || 'No reasoning provided';
  const output = panel.output?.trim() || null;
  const systemPrompt = panel.systemPrompt?.trim() || null;
  const userPrompt = panel.userPrompt?.trim() || null;

  const hasExtra = !!output || !!systemPrompt || !!userPrompt;

  const tabs = [
    { id: 'reasoning' as const, label: 'Reasoning' },
    ...(output ? [{ id: 'output' as const, label: 'Output' }] : []),
    ...(systemPrompt ? [{ id: 'system' as const, label: 'System Prompt' }] : []),
    ...(userPrompt ? [{ id: 'user' as const, label: 'User Prompt' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-gray-200 px-6 pt-5 pb-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {isFailed ? (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  </svg>
                </span>
              ) : (
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                  {aggregateScore}
                </span>
              )}
              <h3 className="text-base font-semibold text-gray-900">
                {isFailed ? 'Judge Error' : 'Judge Details'}
              </h3>
              {!isFailed && isSelected && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Selected
                </span>
              )}
            </div>
            {multiJudge && !isFailed && (
              <p className="text-[11px] text-gray-500">Average score shown; per-judge raw scores below.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {multiJudge && (
          <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">Judges</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {panels.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  const nextPanel = panels[i] ?? panels[0];
                  setJudgeIdx(i);
                  setActiveTab((currentTab) =>
                    getAvailableTabs(nextPanel).includes(currentTab) ? currentTab : 'reasoning',
                  );
                }}
                className={`rounded-xl border px-3 py-2 text-left transition-all ${
                  judgeIdx === i
                    ? 'border-primary-200 bg-white text-primary-700 shadow-sm ring-1 ring-primary-100'
                    : 'border-transparent bg-white/70 text-gray-700 hover:border-gray-200 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-semibold ${judgeIdx === i ? 'text-primary-700' : 'text-gray-800'}`}>
                      {p.shortLabel}
                    </p>
                    <p className="truncate font-mono text-[10px] text-gray-500">{p.judgeModel}</p>
                  </div>
                  {p.rawScore != null && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      judgeIdx === i ? 'bg-primary-50 text-primary-700' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {p.rawScore}
                    </span>
                  )}
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
                {panel.rawScore != null && (
                  <span className="ml-2 text-indigo-600">Score: {panel.rawScore}</span>
                )}
              </p>
            )}
            {panel.judgeTypeUsed && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                panel.judgeTypeUsed === 'batch' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {panel.judgeTypeUsed}
              </span>
            )}
            {panel.judgePromptVersionId && (
              <Link
                href={`/prompt-versions/${panel.judgePromptVersionId}`}
                className="mt-1 block text-[11px] text-primary-600 hover:text-primary-500"
              >
                {panel.judgePromptVersionName || 'View prompt version'}
              </Link>
            )}
          </div>
        )}

        {multiJudge && (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              panel.judgeType === 'batch' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
            }`}>
              Config: {panel.judgeType}
            </span>
            {panel.judgeTypeUsed && (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                panel.judgeTypeUsed === 'batch' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-500'
              }`}>
                Used: {panel.judgeTypeUsed}
              </span>
            )}
            {panel.judgePromptVersionId && (
              <Link
                href={`/prompt-versions/${panel.judgePromptVersionId}`}
                className="text-[11px] text-primary-600 hover:text-primary-500"
              >
                {panel.judgePromptVersionName || 'Prompt version'}
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
                className={`-mb-px border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'reasoning' && (
            <p className={`text-sm leading-relaxed ${isFailed ? 'text-red-700' : 'text-gray-700'}`}>
              {reasoning}
            </p>
          )}
          {activeTab === 'output' && output && (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{output}</pre>
          )}
          {activeTab === 'system' && systemPrompt && (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{systemPrompt}</pre>
          )}
          {activeTab === 'user' && userPrompt && (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{userPrompt}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

export function JudgeScoreBadge({
  runId,
  judgeScore,
  isJudgeSelected,
  judgeReasoning,
  judgeOutput,
  judgeSystemPrompt,
  judgeUserPrompt,
  judgeTypeUsed,
  judgeResults,
  awaitingJudge,
}: JudgeScoreBadgeProps) {
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
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const panels = useMemo(
    () =>
      buildPanels(fetchedDetail?.judgeResults ?? judgeResults ?? null, {
        judgeReasoning: fetchedDetail?.judgeReasoning ?? judgeReasoning,
        judgeOutput: fetchedDetail?.judgeOutput ?? judgeOutput,
        judgeSystemPrompt: fetchedDetail?.judgeSystemPrompt ?? judgeSystemPrompt,
        judgeUserPrompt: fetchedDetail?.judgeUserPrompt ?? judgeUserPrompt,
        judgeTypeUsed: fetchedDetail?.judgeTypeUsed ?? judgeTypeUsed,
        judgeScore: fetchedDetail?.judgeScore ?? judgeScore ?? null,
      }),
    [fetchedDetail, judgeResults, judgeReasoning, judgeOutput, judgeSystemPrompt, judgeUserPrompt, judgeTypeUsed, judgeScore],
  );

  const hasDetail = panels.some(panelHasContent);

  const handleClick = async (e: React.MouseEvent) => {
    if (!hasDetail) return;
    e.stopPropagation();
    e.preventDefault();
    setShowModal(true);
    if (!runId) return;
    if (isLoadingDetail) return;
    if ((judgeResults?.length ?? 0) > 1 && fetchedDetail) return;
    try {
      setIsLoadingDetail(true);
      const res = await fetch(serviceUrl(`strategy-runs/${runId}`), { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const raw = (json.data ?? {}) as Record<string, unknown>;
      const allJudgeResults = parseStrategyRunJudgeResults(raw.judgeResults);

      let winnerCandidateIndex: number | null = null;
      const stepResults = Array.isArray(raw.stepResults) ? raw.stepResults : [];
      for (const sr of stepResults) {
        if (sr && typeof sr === 'object') {
          const s = sr as Record<string, unknown>;
          if (s.isJudgeSelected && s.candidateIndex != null) {
            winnerCandidateIndex = Number(s.candidateIndex);
            break;
          }
        }
      }

      const hasTaggedResults = allJudgeResults.some((j) => j.candidateIndex != null);
      const filteredResults =
        winnerCandidateIndex != null && hasTaggedResults
          ? allJudgeResults.filter((j) => j.candidateIndex === winnerCandidateIndex)
          : allJudgeResults;

      setFetchedDetail({
        judgeScore: raw.judgeScore != null ? Number(raw.judgeScore) : null,
        isJudgeSelected: Boolean(raw.isJudgeSelected),
        judgeReasoning: raw.judgeReasoning != null ? String(raw.judgeReasoning) : null,
        judgeOutput: raw.judgeOutput != null ? String(raw.judgeOutput) : null,
        judgeSystemPrompt: raw.judgeSystemPrompt != null ? String(raw.judgeSystemPrompt) : null,
        judgeUserPrompt: raw.judgeUserPrompt != null ? String(raw.judgeUserPrompt) : null,
        judgeTypeUsed: raw.judgeTypeUsed != null ? String(raw.judgeTypeUsed) : null,
        judgeResults: filteredResults,
      });
    } catch {
      // Keep the fallback data already shown in the modal.
    } finally {
      setIsLoadingDetail(false);
    }
  };

  if (judgeScore != null && judgeScore > 0) {
    return (
      <>
        <span
          className={`absolute top-1 left-1 z-10 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${hasDetail ? 'cursor-help' : ''} ${isJudgeSelected ? 'bg-amber-400 text-amber-900' : 'bg-gray-700/70 text-white'}`}
          onClick={handleClick}
        >
          {judgeScore}
        </span>
        {showModal && hasDetail && (
          <ReasoningModal
            aggregateScore={fetchedDetail?.judgeScore ?? judgeScore}
            panels={panels}
            isSelected={fetchedDetail?.isJudgeSelected ?? isJudgeSelected}
            isFailed={false}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  if (judgeScore === 0) {
    return (
      <>
        <span
          className={`absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ${hasDetail ? 'cursor-help' : ''}`}
          onClick={handleClick}
        >
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          Judge failed
        </span>
        {showModal && (
          <ReasoningModal
            aggregateScore={0}
            panels={panels}
            isFailed
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  if (awaitingJudge) {
    return (
      <span className="absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
        <svg className="h-2.5 w-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Judging
      </span>
    );
  }

  return null;
}

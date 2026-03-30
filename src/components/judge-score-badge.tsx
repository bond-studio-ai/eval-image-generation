'use client';

import type { StrategyRunJudgeResultEntry } from '@/lib/service-client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface JudgeScoreBadgeProps {
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

type DetailPanel = {
  key: string;
  shortLabel: string;
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

function buildPanels(
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
      shortLabel: `#${i + 1}`,
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

function ReasoningModal({
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
  const [activeTab, setActiveTab] = useState<'reasoning' | 'output' | 'system' | 'user'>('reasoning');

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
        <div className="flex items-center justify-between border-b border-gray-200 px-6 pt-5 pb-4">
          <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2.5">
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
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900">
                {isFailed ? 'Judge Error' : 'Judge Details'}
              </h3>
              {multiJudge && !isFailed && (
                <p className="text-[11px] text-gray-500">Weighted aggregate score shown; per-judge raw scores below.</p>
              )}
            </div>
            {!isFailed && isSelected && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Selected
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {multiJudge && (
          <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50/80 px-4 py-2">
            {panels.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setJudgeIdx(i);
                  setActiveTab('reasoning');
                }}
                className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                  judgeIdx === i ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white/80'
                }`}
              >
                <span className="text-gray-400">{p.shortLabel}</span>{' '}
                <span className="font-mono text-[10px] text-gray-700">{p.judgeModel}</span>
                {p.rawScore != null && (
                  <span className="ml-1 text-[10px] text-indigo-600">· {p.rawScore}</span>
                )}
              </button>
            ))}
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

  const panels = useMemo(
    () =>
      buildPanels(judgeResults ?? null, {
        judgeReasoning,
        judgeOutput,
        judgeSystemPrompt,
        judgeUserPrompt,
        judgeTypeUsed,
        judgeScore: judgeScore ?? null,
      }),
    [judgeResults, judgeReasoning, judgeOutput, judgeSystemPrompt, judgeUserPrompt, judgeTypeUsed, judgeScore],
  );

  const hasDetail = panels.some(panelHasContent);

  const handleClick = (e: React.MouseEvent) => {
    if (!hasDetail) return;
    e.stopPropagation();
    e.preventDefault();
    setShowModal(true);
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
            aggregateScore={judgeScore}
            panels={panels}
            isSelected={isJudgeSelected}
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

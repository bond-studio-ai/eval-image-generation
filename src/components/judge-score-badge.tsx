'use client';

import { useState } from 'react';

interface JudgeScoreBadgeProps {
  judgeScore: number | null | undefined;
  isJudgeSelected?: boolean;
  judgeReasoning?: string | null;
  judgeOutput?: string | null;
  judgeSystemPrompt?: string | null;
  judgeUserPrompt?: string | null;
  judgeTypeUsed?: string | null;
  awaitingJudge?: boolean;
}

function ReasoningModal({
  score,
  reasoning,
  output,
  systemPrompt,
  userPrompt,
  judgeTypeUsed,
  isSelected,
  isFailed,
  onClose,
}: {
  score: number;
  reasoning: string;
  output?: string | null;
  systemPrompt?: string | null;
  userPrompt?: string | null;
  judgeTypeUsed?: string | null;
  isSelected?: boolean;
  isFailed: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'reasoning' | 'output' | 'system' | 'user'>('reasoning');
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
        className="mx-4 flex w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            {isFailed ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              </span>
            ) : (
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                {score}
              </span>
            )}
            <h3 className="text-base font-semibold text-gray-900">
              {isFailed ? 'Judge Error' : 'Judge Details'}
            </h3>
            {!isFailed && isSelected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Selected
              </span>
            )}
            {judgeTypeUsed && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                judgeTypeUsed === 'batch' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {judgeTypeUsed}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
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

        {/* Content */}
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
  awaitingJudge,
}: JudgeScoreBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const hasDetail = !!judgeReasoning || !!judgeOutput || !!judgeSystemPrompt || !!judgeUserPrompt;

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
            score={judgeScore}
            reasoning={judgeReasoning || 'No reasoning provided'}
            output={judgeOutput}
            systemPrompt={judgeSystemPrompt}
            userPrompt={judgeUserPrompt}
            judgeTypeUsed={judgeTypeUsed}
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
            score={0}
            reasoning={judgeReasoning || 'Judge failed'}
            output={judgeOutput}
            systemPrompt={judgeSystemPrompt}
            userPrompt={judgeUserPrompt}
            judgeTypeUsed={judgeTypeUsed}
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

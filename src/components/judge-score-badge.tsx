'use client';

import { useState } from 'react';

interface JudgeScoreBadgeProps {
  judgeScore: number | null | undefined;
  isJudgeSelected?: boolean;
  judgeReasoning?: string | null;
  awaitingJudge?: boolean;
}

function ReasoningModal({
  score,
  reasoning,
  isSelected,
  isFailed,
  onClose,
}: {
  score: number;
  reasoning: string;
  isSelected?: boolean;
  isFailed: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
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
              {isFailed ? 'Judge Error' : 'Judge Reasoning'}
            </h3>
            {!isFailed && isSelected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
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
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className={`mt-4 text-sm leading-relaxed ${isFailed ? 'text-red-700' : 'text-gray-700'}`}>
          {reasoning}
        </p>
      </div>
    </div>
  );
}

export function JudgeScoreBadge({
  judgeScore,
  isJudgeSelected,
  judgeReasoning,
  awaitingJudge,
}: JudgeScoreBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!judgeReasoning) return;
    e.stopPropagation();
    e.preventDefault();
    setShowModal(true);
  };

  if (judgeScore != null && judgeScore > 0) {
    return (
      <>
        <span
          className={`absolute top-1 left-1 z-10 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${judgeReasoning ? 'cursor-help' : ''} ${isJudgeSelected ? 'bg-amber-400 text-amber-900' : 'bg-gray-700/70 text-white'}`}
          onClick={handleClick}
        >
          {judgeScore}
        </span>
        {showModal && judgeReasoning && (
          <ReasoningModal
            score={judgeScore}
            reasoning={judgeReasoning}
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
          className={`absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ${judgeReasoning ? 'cursor-help' : ''}`}
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

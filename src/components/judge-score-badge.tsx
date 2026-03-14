'use client';

interface JudgeScoreBadgeProps {
  judgeScore: number | null | undefined;
  isJudgeSelected?: boolean;
  judgeReasoning?: string | null;
  awaitingJudge?: boolean;
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute top-full left-0 z-50 mt-1 hidden w-56 rounded-lg bg-gray-900 px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-100 shadow-lg group-hover/badge:block">
      {text}
    </span>
  );
}

export function JudgeScoreBadge({
  judgeScore,
  isJudgeSelected,
  judgeReasoning,
  awaitingJudge,
}: JudgeScoreBadgeProps) {
  if (judgeScore != null && judgeScore > 0) {
    return (
      <span
        className={`group/badge absolute top-1 left-1 z-10 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${isJudgeSelected ? 'bg-amber-400 text-amber-900' : 'bg-gray-700/70 text-white'}`}
      >
        {judgeScore}
        {judgeReasoning && <Tooltip text={judgeReasoning} />}
      </span>
    );
  }

  if (judgeScore === 0) {
    return (
      <span className="group/badge absolute top-1 left-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        Judge failed
        <Tooltip text={judgeReasoning || 'Judge failed'} />
      </span>
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

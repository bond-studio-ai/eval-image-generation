'use client';

interface ScoreTagProps {
  score: number | null;
  status: string;
}

export function ScoreTag({ score, status }: ScoreTagProps) {
  if (score !== null) {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
        {score}%
      </span>
    );
  }
  if (!status) return null;

  const isNeedsEval = status.toLowerCase() === 'needs eval';
  if (isNeedsEval) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Needs eval
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      {status}
    </span>
  );
}

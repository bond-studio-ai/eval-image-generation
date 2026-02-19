'use client';

import { useCallback, useState } from 'react';

export function StrategyRunButton({ strategyId, onRunCreated }: { strategyId: string; onRunCreated?: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/run`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Failed to run strategy');
        return;
      }

      onRunCreated?.();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [strategyId, onRunCreated]);

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={submitting}
        className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Starting...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
            Run Strategy
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

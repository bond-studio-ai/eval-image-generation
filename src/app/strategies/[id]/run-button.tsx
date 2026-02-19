'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export function StrategyRunButton({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
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

      router.refresh();
    } catch {
      setError('Network error');
    }
  }, [strategyId, router]);

  return (
    <div>
      <button
        onClick={handleRun}
        className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
        </svg>
        Run Strategy
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

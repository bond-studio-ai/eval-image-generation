'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Triggers the catalog-feed nightly calibration job on demand. The
 * endpoint returns HTTP 202 (Accepted) and enqueues the work, so we
 * refresh the page a moment later to pick up the freshly-inserted
 * active row.
 */
export function RecomputeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const trigger = async () => {
    setLoading(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch('/api/v1/catalog-feed/admin/calibrations/recompute', {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      }
      setOk(true);
      // Calibration is async upstream; give it a moment before re-querying.
      setTimeout(() => router.refresh(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={trigger}
        disabled={loading}
        className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
      >
        {loading ? 'Queuing…' : 'Recompute now'}
      </button>
      {ok && <span className="text-[10px] text-green-700">Job enqueued</span>}
      {error && <span className="text-[10px] text-red-700">{error}</span>}
    </div>
  );
}

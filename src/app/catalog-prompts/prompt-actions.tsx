'use client';

import type { PromptStatus } from '@/lib/catalog-feed-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * PromptActions renders the per-row controls: "Approve" promotes a
 * proposal to active (which the service collapses into a single CTE
 * so the (kind, scope) never observes zero or two active rows).
 * Active and retired rows have no actions — retirement happens as a
 * side-effect of a successful promote.
 */
export function PromptActions({ id, status }: { id: string; status: PromptStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'proposed') {
    return <span className="text-gray-400">—</span>;
  }

  const approve = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/catalog-feed/admin/prompts/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={approve}
        disabled={loading}
        className="inline-flex items-center rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:bg-green-300"
      >
        {loading ? 'Promoting…' : 'Approve'}
      </button>
      {error && <span className="text-[10px] text-red-700">{error}</span>}
    </div>
  );
}

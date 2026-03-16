'use client';

import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export function CloneButton({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClone = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(serviceUrl(`strategies/${strategyId}/clone`), { method: 'POST' });
      if (!res.ok) return;
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) {
        router.push(`/strategies/${newId}`);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [strategyId, router]);

  return (
    <button
      type="button"
      onClick={handleClone}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
      </svg>
      {loading ? 'Cloning…' : 'Clone'}
    </button>
  );
}

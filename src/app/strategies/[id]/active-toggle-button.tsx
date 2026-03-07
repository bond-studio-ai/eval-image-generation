'use client';

import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export function ActiveToggleButton({ strategyId, isActive }: { strategyId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      const action = isActive ? 'deactivate' : 'activate';
      const res = await fetch(serviceUrl(`strategies/${strategyId}/${action}`), { method: 'POST' });
      if (!res.ok) return;
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [strategyId, isActive, router]);

  if (isActive) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
          <span className="h-2 w-2 rounded-full bg-green-600" />
          Active
        </span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Deactivate
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex items-center rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-100 disabled:opacity-50"
    >
      Set as Active
    </button>
  );
}

'use client';

import { ExecutionsRunButton } from './executions-run-button';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function ExecutionsPageHeader() {
  const router = useRouter();
  const handleRunCreated = useCallback(() => router.refresh(), [router]);

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
        <p className="mt-1 text-sm text-gray-600">
          Run strategies and browse generated images.
        </p>
      </div>
      <div className="shrink-0">
        <ExecutionsRunButton onRunCreated={handleRunCreated} />
      </div>
    </div>
  );
}

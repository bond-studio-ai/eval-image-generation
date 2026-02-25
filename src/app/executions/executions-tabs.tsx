'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { BatchRunsTab } from './batch-tab';
import { ExecutionsRunButton } from './executions-run-button';

export function ExecutionsTabs() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRunCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div>
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

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        <Link
          href="/executions"
          className="border-b-2 border-primary-600 px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors"
        >
          Batches
        </Link>
        <Link
          href="/executions?tab=generations"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
        >
          Generations
        </Link>
      </div>

      <BatchRunsTab refreshKey={refreshKey} />
    </div>
  );
}

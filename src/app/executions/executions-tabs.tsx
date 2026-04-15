'use client';

import { PageHeader } from '@/components/page-header';
import { ScopeToggle } from '@/components/scope-toggle';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { BatchRunsTab } from './batch-tab';
import { ExecutionsRunButton } from './executions-run-button';

export function ExecutionsTabs() {
  const [refreshKey, setRefreshKey] = useState(0);
  const searchParams = useSearchParams();
  const source = searchParams.get('source') === 'benchmark' ? 'benchmark' : 'default';

  const handleRunCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Runs"
          subtitle={
            source === 'benchmark'
              ? 'Run benchmark projects and review benchmark image generations.'
              : 'Run strategies and browse generated images.'
          }
          actions={
            <>
              <ScopeToggle />
              <ExecutionsRunButton onRunCreated={handleRunCreated} />
            </>
          }
        />
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        <Link
          href={source === 'benchmark' ? '/executions?source=benchmark' : '/executions'}
          className="border-b-2 border-primary-600 px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors"
        >
          Batches
        </Link>
        <Link
          href={source === 'benchmark' ? '/executions?tab=generations&source=benchmark' : '/executions?tab=generations'}
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
        >
          Generations
        </Link>
      </div>

      <BatchRunsTab refreshKey={refreshKey} source={source} />
    </div>
  );
}
